import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, ForbiddenException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { describeError, normalizeBankReference } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MANUAL_TOP_UP } from '../constants';
import { ManualTopUpDto } from '../dto';
import { MerchantToppedUpEvent, MerchantTopUpReversedEvent } from '../events';
import { MerchantRepository } from '../repositories';
import { LedgerMove, ManualTopUpRepository } from '../repositories/manual-top-up.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Adds money to a merchant's wallet when they have paid the platform by bank transfer or UPI instead of through the
 * payment gateway. An admin checks the transfer in the bank account and records it here with the bank's reference.
 *
 * WHY it is guarded so tightly: this moves real money on one person's say-so.
 * - The bank reference can only be used once.
 * - An admin can not credit a business they own.
 * - A large amount is not credited until a different admin approves it.
 * - A mistake is taken back with a reversal, which is a new entry: the original stays in the history.
 * - Every step is written to the audit log with who did it.
 */
@Injectable()
export class ManualTopUpService {
  private readonly logger = new Logger(ManualTopUpService.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly topUpRepository: ManualTopUpRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async record(merchantId: string, adminId: string, dto: ManualTopUpDto, ipAddress?: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    // A new merchant is ACTIVE from the start; it is the admin's approval that makes it a verified business.
    if (merchant.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Money can only be added to a merchant that has been approved.');
    }
    if (merchant.status !== 'ACTIVE') {
      throw new BadRequestException(`Money can not be added while the merchant is ${merchant.status.toLowerCase().replace(/_/g, ' ')}.`);
    }
    // Whoever records the money must not be the one it goes to: a second person has to be involved.
    if (merchant.userId === adminId) {
      throw new ForbiddenException('You can not add money to your own business. Ask another admin to record it.');
    }

    const receivedOn = this.parseReceivedOn(dto.receivedOn);
    const bankReference = normalizeBankReference(dto.bankReference);
    const threshold = await this.approvalThreshold();
    const needsApproval = threshold > 0 && dto.amount > threshold;

    const { topUp, move } = await this.topUpRepository.record({
      merchantId,
      amount: dto.amount,
      bankReference,
      receivedOn,
      note: dto.note || undefined,
      recordedBy: adminId,
      needsApproval,
    });

    await this.audit(adminId, merchantId, ipAddress, move, {
      action: needsApproval ? 'CREATE' : 'UPDATE',
      after: {
        amount: dto.amount,
        bankReference,
        receivedOn: dto.receivedOn,
        manualTopUpId: topUp.id,
        status: topUp.status,
        ...(needsApproval ? { waitingForSecondAdmin: true, threshold } : {}),
      },
    });
    if (move) this.announceCredit(merchantId, dto.amount, bankReference, move);
    this.logger.log(`Admin ${adminId} ${needsApproval ? 'recorded, awaiting a second admin,' : 'credited'} ₹${dto.amount} for merchant ${merchantId} (bank ref ${bankReference})`);

    return { ...topUp, balanceAfter: move?.balanceAfter ?? null };
  }

  /** A different admin approves a large top-up, and it is credited. */
  async approve(topUpId: string, adminId: string, ipAddress?: string) {
    const existing = await this.requireTopUp(topUpId);
    await this.assertNotOwnBusiness(existing.merchantWallet.merchantId, adminId);

    const { topUp, move } = await this.topUpRepository.approve({ topUpId, adminId });

    const merchantId = topUp.merchantWallet.merchantId;
    await this.audit(adminId, merchantId, ipAddress, move, {
      action: 'APPROVE',
      after: { manualTopUpId: topUpId, credited: Number(topUp.amount), bankReference: topUp.bankReference, recordedBy: topUp.recordedBy },
    });
    this.announceCredit(merchantId, Number(topUp.amount), topUp.bankReference as string, move);
    return { ...topUp, balanceAfter: move.balanceAfter };
  }

  /** A different admin turns a large top-up down. Nothing was credited. */
  async reject(topUpId: string, adminId: string, reason: string, ipAddress?: string) {
    const existing = await this.requireTopUp(topUpId);
    await this.assertNotOwnBusiness(existing.merchantWallet.merchantId, adminId);

    const topUp = await this.topUpRepository.reject({ topUpId, adminId, reason });

    await this.audit(adminId, existing.merchantWallet.merchantId, ipAddress, null, {
      action: 'REJECT',
      after: { manualTopUpId: topUpId, reason, releasedReference: topUp.rejectedReference },
    });
    return topUp;
  }

  /** Takes a top-up made in error back out of the wallet, as long as the merchant still has the money. */
  async reverse(topUpId: string, adminId: string, reason: string, ipAddress?: string) {
    const existing = await this.requireTopUp(topUpId);
    await this.assertNotOwnBusiness(existing.merchantWallet.merchantId, adminId);

    const { topUp, move } = await this.topUpRepository.reverse({ topUpId, adminId, reason });

    const merchantId = topUp.merchantWallet.merchantId;
    await this.audit(adminId, merchantId, ipAddress, move, {
      action: 'UPDATE',
      after: { manualTopUpId: topUpId, reversed: Number(topUp.amount), bankReference: topUp.bankReference, reason },
    });
    this.eventEmitter.emit('merchant.wallet.top_up_reversed', new MerchantTopUpReversedEvent(merchantId, Number(topUp.amount), reason, move.balanceAfter));
    this.logger.warn(`Admin ${adminId} reversed top-up ${topUpId} (₹${Number(topUp.amount)}) for merchant ${merchantId}: ${reason}`);
    return { ...topUp, balanceAfter: move.balanceAfter };
  }

  async list(merchantId: string, page = 1, limit = 20) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');
    return this.topUpRepository.findByMerchant(merchantId, page, limit);
  }

  /** Large top-ups waiting for a second admin, across all merchants. */
  async listPendingApproval(page = 1, limit = 20) {
    return this.topUpRepository.findPendingApproval(page, limit);
  }

  /** What amount needs a second admin: the platform setting, or the default before anyone has saved one. 0 means none does. */
  private async approvalThreshold(): Promise<number> {
    const config = await this.prisma.platformConfiguration.findFirst({ where: { deletedAt: null }, select: { manualTopUpApprovalThreshold: true } });
    return config ? Number(config.manualTopUpApprovalThreshold) : MANUAL_TOP_UP.DEFAULT_APPROVAL_THRESHOLD;
  }

  private async requireTopUp(topUpId: string) {
    const topUp = await this.topUpRepository.findById(topUpId);
    if (!topUp) throw new NotFoundException('Top-up');
    return topUp;
  }

  private async assertNotOwnBusiness(merchantId: string, adminId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (merchant?.userId === adminId) throw new ForbiddenException('You can not act on money for your own business. Ask another admin.');
  }

  private announceCredit(merchantId: string, amount: number, bankReference: string, move: LedgerMove) {
    this.eventEmitter.emit('merchant.wallet.topped_up', new MerchantToppedUpEvent(merchantId, amount, bankReference, move.balanceAfter));
  }

  /**
   * The money has moved by now, so a failing audit write must not turn a done credit into an error the admin would
   * retry. The top-up record itself keeps who, how much and which reference, so nothing is lost either way.
   */
  private async audit(
    adminId: string,
    merchantId: string,
    ipAddress: string | undefined,
    move: LedgerMove | null,
    entry: { action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT'; after: Record<string, string | number | boolean | null> },
  ) {
    try {
      await this.auditLogService.record({
        actorId: adminId,
        actorType: 'ADMIN',
        entity: 'MerchantWallet',
        entityId: merchantId,
        action: entry.action,
        ...(move ? { before: { availableBalance: move.balanceBefore } } : {}),
        after: { ...entry.after, ...(move ? { availableBalance: move.balanceAfter } : {}) },
        ipAddress,
      });
    } catch (error) {
      this.logger.error(`A top-up change for merchant ${merchantId} was made but its audit entry could not be written: ${describeError(error)}`);
    }
  }

  /** A real calendar date, not in the future, and not so old that it could be a reused reference. */
  private parseReceivedOn(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('receivedOn is not a real date');
    }

    const now = Date.now();
    // A day of slack for time zones: it is already tomorrow in India while it is still today in UTC.
    if (date.getTime() > now + DAY_MS) throw new BadRequestException('receivedOn can not be in the future');
    if (date.getTime() < now - MANUAL_TOP_UP.MAX_AGE_DAYS * DAY_MS) {
      throw new BadRequestException(`receivedOn is more than ${MANUAL_TOP_UP.MAX_AGE_DAYS} days ago. Contact a developer to record an older transfer.`);
    }
    return date;
  }
}
