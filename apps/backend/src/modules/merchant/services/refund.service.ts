import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { describeError } from '@common/utils';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { RazorpayService } from '../../payment/services';
import { REVIEWABLE_REFUND_STATUSES } from '../constants';
import { CreateRefundDto, RejectRefundDto } from '../dto';
import { RefundRequestedEvent, RefundReviewedEvent } from '../events';
import { MerchantBankRepository, MerchantRefundRepository, MerchantRepository, MerchantWalletRepository } from '../repositories';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly refundRepository: MerchantRefundRepository,
    private readonly walletRepository: MerchantWalletRepository,
    private readonly merchantRepository: MerchantRepository,
    private readonly bankRepository: MerchantBankRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
    private readonly razorpayService: RazorpayService,
  ) {}

  async request(merchantId: string, dto: CreateRefundDto) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    // Business KYC gate — mirrors the PAN-verification gate on user
    // withdrawals. Money only leaves the platform for a merchant that has
    // completed business verification.
    if (merchant.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Business verification is required before you can request a refund. Complete KYC verification first.');
    }

    const bankAccount = await this.bankRepository.findById(dto.bankAccountId);
    if (!bankAccount || bankAccount.merchantId !== merchantId) {
      throw new NotFoundException('Bank account');
    }
    if (bankAccount.verificationStatus === 'FAILED') {
      throw new BadRequestException('This bank account failed verification and cannot receive payouts');
    }

    const wallet = await this.walletRepository.getOrCreate(merchantId);
    if (Number(wallet.availableBalance) < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const refund = await this.refundRepository.create({
      merchantWallet: { connect: { id: wallet.id } },
      bankAccount: { connect: { id: bankAccount.id } },
      amount: dto.amount,
      reason: dto.reason,
      status: 'PENDING',
    });

    try {
      await this.walletRepository.holdForRefund({
        merchantWalletId: wallet.id,
        amount: dto.amount,
        refundId: refund.id,
      });
    } catch (error) {
      // The pre-check above already validated the balance; this only
      // catches a genuine race against a concurrent request. Undo the
      // request row we just created rather than leaving it stranded PENDING
      // with no hold behind it.
      await this.refundRepository.update(refund.id, {
        status: 'CANCELLED',
        rejectionReason: 'Insufficient balance at time of processing',
        deletedAt: new Date(),
      });
      throw error;
    }

    this.eventEmitter.emit(
      'merchant.refund.requested',
      new RefundRequestedEvent(refund.id, merchantId, dto.amount),
    );

    return this.refundRepository.findById(refund.id);
  }

  async listMine(merchantId: string, page: number, limit: number) {
    const wallet = await this.walletRepository.getOrCreate(merchantId);
    return this.refundRepository.findByMerchantWalletId({ merchantWalletId: wallet.id, page, limit });
  }

  /** Admin queue: refund requests awaiting a reviewer decision, oldest first. */
  async listPendingForAdmin(page: number, limit: number) {
    return this.refundRepository.findPendingForAdmin({ page, limit });
  }

  async getMine(refundId: string, merchantId: string) {
    const refund = await this.refundRepository.findById(refundId);
    if (!refund || refund.merchantWallet.merchantId !== merchantId) {
      throw new NotFoundException('Refund request');
    }
    return refund;
  }

  async approve(refundId: string, reviewerId: string) {
    const refund = await this.getReviewable(refundId);

    await this.walletRepository.finalizeRefund({
      merchantWalletId: refund.merchantWalletId,
      amount: Number(refund.amount),
      refundId: refund.id,
    });

    await this.refundRepository.update(refundId, {
      status: 'APPROVED',
      processedBy: reviewerId,
      processedAt: new Date(),
    });

    await this.refundRepository.createLog({
      refund: { connect: { id: refundId } },
      oldStatus: refund.status,
      newStatus: 'APPROVED',
      changedBy: reviewerId,
    });

    this.eventEmitter.emit(
      'merchant.refund.approved',
      new RefundReviewedEvent(refundId, refund.merchantWallet.merchantId, true),
    );

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'MerchantRefundRequest',
      entityId: refundId,
      action: 'APPROVE',
      before: { status: refund.status },
      after: { status: 'APPROVED' },
    });

    // Money has already left the wallet (finalizeRefund above) — a payout
    // failure here doesn't get reversed until Razorpay's webhook reports it
    // definitively failed/reversed (see MerchantRefundPayoutListener), since
    // an API error at this exact moment could just as easily be a transient blip.
    await this.initiatePayout(refund);

    return this.refundRepository.findById(refundId);
  }

  async reject(refundId: string, reviewerId: string, dto: RejectRefundDto) {
    const refund = await this.getReviewable(refundId);

    await this.walletRepository.releaseRefundHold({
      merchantWalletId: refund.merchantWalletId,
      amount: Number(refund.amount),
      refundId: refund.id,
    });

    const updated = await this.refundRepository.update(refundId, {
      status: 'REJECTED',
      rejectionReason: dto.rejectionReason,
      processedBy: reviewerId,
      processedAt: new Date(),
    });

    await this.refundRepository.createLog({
      refund: { connect: { id: refundId } },
      oldStatus: refund.status,
      newStatus: 'REJECTED',
      remarks: dto.rejectionReason,
      changedBy: reviewerId,
    });

    this.eventEmitter.emit(
      'merchant.refund.rejected',
      new RefundReviewedEvent(refundId, refund.merchantWallet.merchantId, false),
    );

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'MerchantRefundRequest',
      entityId: refundId,
      action: 'REJECT',
      before: { status: refund.status },
      after: { status: 'REJECTED', reason: dto.rejectionReason },
    });

    return updated;
  }

  private async getReviewable(refundId: string) {
    const refund = await this.refundRepository.findById(refundId);
    if (!refund) throw new NotFoundException('Refund request');
    if (!REVIEWABLE_REFUND_STATUSES.includes(refund.status)) {
      throw new BadRequestException(`Refund request is already ${refund.status.toLowerCase()}`);
    }
    return refund;
  }

  /**
   * Fires the actual RazorpayX payout for an approved refund. A contact +
   * fund account is created fresh on every call rather than cached against
   * the bank account, matching the same tradeoff the user withdrawal flow
   * makes (see WithdrawalService.initiatePayout).
   */
  private async initiatePayout(refund: NonNullable<Awaited<ReturnType<MerchantRefundRepository['findById']>>>) {
    if (!refund.bankAccount) {
      this.logger.error(`Refund ${refund.id} was approved with no bank account on file — payout not attempted`);
      return;
    }

    try {
      const customer = await this.razorpayService.createCustomer({ name: refund.bankAccount.accountHolderName });
      const fundAccount = await this.razorpayService.createFundAccount({
        customerId: customer.id,
        accountHolderName: refund.bankAccount.accountHolderName,
        accountNumber: refund.bankAccount.accountNumber,
        ifscCode: refund.bankAccount.ifscCode,
      });
      const payout = await this.razorpayService.createPayout({
        fundAccountId: fundAccount.id,
        amountInRupees: Number(refund.amount),
        referenceId: refund.id,
        narration: 'Merchant refund payout',
      });

      await this.refundRepository.update(refund.id, {
        status: 'PROCESSING',
        metadata: { razorpayPayoutId: payout.id, razorpayFundAccountId: fundAccount.id },
      });
    } catch (error) {
      const message = describeError(error);
      this.logger.error(`RazorpayX payout failed to initiate for refund ${refund.id}: ${message}`);
      await this.refundRepository.update(refund.id, { metadata: { payoutInitiationError: message } });
    }
  }
}
