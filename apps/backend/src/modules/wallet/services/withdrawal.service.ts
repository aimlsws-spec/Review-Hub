import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { describeError, normalizeBankReference } from '@common/utils';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { DeviceRepository } from '../../auth/repositories/device.repository';
import { PAYMENT_PROVIDER, PaymentProvider } from '../../payment/interfaces';
import { AccountLinkageService } from '../../risk/services';
import { UserKycService } from '../../user-kyc/services';
import { DEVICE_RISK_HOLD_THRESHOLD } from '../constants';
import { CreateWithdrawalDto, MarkWithdrawalFailedDto, MarkWithdrawalPaidDto, RejectWithdrawalDto } from '../dto';
import { WithdrawalFailedEvent, WithdrawalPaidEvent, WithdrawalRequestedEvent, WithdrawalReviewedEvent } from '../events';
import { UserBankAccountRepository, UserWalletRepository, WithdrawalRepository, WithdrawalSettlementRepository } from '../repositories';

import { WithdrawalPolicyService } from './withdrawal-policy.service';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly bankRepository: UserBankAccountRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentService: PaymentProvider,
    private readonly userKycService: UserKycService,
    private readonly deviceRepository: DeviceRepository,
    private readonly accountLinkage: AccountLinkageService,
    private readonly settlementRepository: WithdrawalSettlementRepository,
    private readonly policyService: WithdrawalPolicyService,
  ) {}

  async request(userId: string, dto: CreateWithdrawalDto, deviceId?: string) {
    const settings = await this.policyService.getSettings();
    this.policyService.assertAmountAllowed(settings, dto.amount);

    // PAN verification before withdrawals — a product requirement, not just a
    // nice-to-have (see the original spec's "PAN verification (before
    // withdrawals)" registration step).
    const panVerified = await this.userKycService.isPanVerified(userId);
    if (!panVerified) {
      throw new BadRequestException('PAN verification is required before you can withdraw. Upload and verify your PAN in KYC settings first.');
    }

    const bankAccount = await this.bankRepository.findById(dto.bankAccountId);
    if (!bankAccount || bankAccount.userId !== userId) {
      throw new NotFoundException('Bank account');
    }
    // Bank account verification (e.g. penny-drop) isn't built yet either, so
    // this still only excludes accounts already flagged FAILED rather than
    // hard-gating on verificationStatus === VERIFIED — identity KYC (above)
    // is the real gate for now.
    if (bankAccount.verificationStatus === 'FAILED') {
      throw new BadRequestException('This bank account failed verification and cannot receive payouts');
    }
    this.policyService.assertBankReady(bankAccount, settings);

    const wallet = await this.walletRepository.getOrCreate(userId);
    const { status: initialStatus, reason: holdReason } = await this.resolveInitialStatus(userId, deviceId);

    // The request, the daily and monthly limits, the balance check and the hold on the money all happen in one
    // transaction, so two requests made at the same moment can not both get through.
    const withdrawal = await this.settlementRepository.request({
      walletId: wallet.id,
      bankAccountId: bankAccount.id,
      amount: dto.amount,
      status: initialStatus,
      limits: { daily: settings.dailyLimit, monthly: settings.monthlyLimit },
    });

    if (initialStatus === 'UNDER_REVIEW') {
      await this.auditLogService.record({
        actorId: 'risk-check',
        actorType: 'SYSTEM',
        entity: 'WithdrawalRequest',
        entityId: withdrawal.id,
        action: 'STATUS_CHANGE',
        before: { status: 'PENDING' },
        after: { status: 'UNDER_REVIEW', reason: holdReason },
      });
    }

    this.eventEmitter.emit(
      'wallet.withdrawal.requested',
      new WithdrawalRequestedEvent(withdrawal.id, userId, dto.amount),
    );

    return this.withdrawalRepository.findById(withdrawal.id);
  }

  async listMine(userId: string, page: number, limit: number) {
    const wallet = await this.walletRepository.getOrCreate(userId);
    return this.withdrawalRepository.findByWalletId({ walletId: wallet.id, page, limit });
  }

  /** Admin queue: withdrawals awaiting a reviewer decision, oldest first. */
  async listPendingForAdmin(page: number, limit: number) {
    return this.withdrawalRepository.findPendingForAdmin({ page, limit });
  }

  async getMine(withdrawalId: string, userId: string) {
    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal || withdrawal.wallet.userId !== userId) {
      throw new NotFoundException('Withdrawal request');
    }
    return withdrawal;
  }

  /**
   * Approves a withdrawal: the money leaves the user's balance for good, in the same step as the status change.
   * Then it is paid out the way the platform is set up to pay: through the gateway, or by an admin who sends it and
   * records the bank's reference (see markPaid).
   */
  async approve(withdrawalId: string, reviewerId: string) {
    const { payoutMode, tds } = await this.policyService.getSettings();
    const approved = await this.settlementRepository.approve({
      withdrawalId,
      reviewerId,
      payoutMode,
      tds: { rate: tds.rate, threshold: tds.annualThreshold, section: tds.section },
    });

    this.eventEmitter.emit('wallet.withdrawal.approved', new WithdrawalReviewedEvent(withdrawalId, approved.wallet.userId, true));

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawalId,
      action: 'APPROVE',
      before: { status: 'PENDING' },
      after: { status: 'APPROVED', payoutMode, ...(Number(approved.tdsAmount) > 0 ? { tdsAmount: Number(approved.tdsAmount) } : {}) },
    });

    // Money has already left the user's balance — a payout failure here doesn't get reversed until the gateway's
    // webhook reports it definitively failed/reversed (see PayoutListener), since an API error at this exact moment
    // could just as easily be a transient blip. In manual mode nothing is sent: it waits for an admin.
    if (payoutMode === 'GATEWAY') await this.initiatePayout(withdrawalId);

    return this.withdrawalRepository.findById(withdrawalId);
  }

  async reject(withdrawalId: string, reviewerId: string, dto: RejectWithdrawalDto) {
    const rejected = await this.settlementRepository.reject({ withdrawalId, reviewerId, reason: dto.rejectionReason });

    this.eventEmitter.emit('wallet.withdrawal.rejected', new WithdrawalReviewedEvent(withdrawalId, rejected.wallet.userId, false));

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawalId,
      action: 'REJECT',
      before: { status: 'PENDING' },
      after: { status: 'REJECTED', reason: dto.rejectionReason },
    });

    return rejected;
  }

  /** Approved withdrawals that are waiting for someone to send the money and record the reference. */
  async listAwaitingManualPayout(page: number, limit: number) {
    return this.settlementRepository.findAwaitingManualPayout(page, limit);
  }

  /**
   * An admin has sent the money by bank transfer and records the bank's reference. The reference can be used once,
   * so the same transfer can not settle two withdrawals. Only a withdrawal waiting on a person can be settled this
   * way: one the gateway already has is not theirs to mark, or it could be paid twice.
   */
  async markPaid(withdrawalId: string, adminId: string, dto: MarkWithdrawalPaidDto) {
    const reference = normalizeBankReference(dto.reference);
    const outcome = await this.settlementRepository.markPaid({
      withdrawalId,
      source: 'MANUAL',
      reference,
      actorId: adminId,
      note: dto.note || undefined,
    });
    if (!outcome.applied) throw new BadRequestException('This withdrawal is already paid');

    const userId = outcome.withdrawal.wallet.userId;
    this.eventEmitter.emit('wallet.withdrawal.paid', new WithdrawalPaidEvent(withdrawalId, userId, Number(outcome.withdrawal.amount), reference));
    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawalId,
      action: 'STATUS_CHANGE',
      before: { status: 'APPROVED' },
      after: { status: 'PAID', payoutMode: 'MANUAL', payoutReference: reference },
    });
    this.logger.log(`Admin ${adminId} marked withdrawal ${withdrawalId} paid by hand (bank ref ${reference})`);

    return this.withdrawalRepository.findById(withdrawalId);
  }

  /** An admin could not send the money. It goes back to the user's available balance, once, in the same step. */
  async markFailed(withdrawalId: string, adminId: string, dto: MarkWithdrawalFailedDto) {
    const outcome = await this.settlementRepository.markFailed({ withdrawalId, source: 'MANUAL', reason: dto.reason, actorId: adminId });
    if (!outcome.applied) throw new BadRequestException(`This withdrawal is ${outcome.status.toLowerCase()}, so it can not be marked failed`);

    const userId = outcome.withdrawal.wallet.userId;
    this.eventEmitter.emit('wallet.withdrawal.failed', new WithdrawalFailedEvent(withdrawalId, userId, Number(outcome.withdrawal.amount), dto.reason));
    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawalId,
      action: 'STATUS_CHANGE',
      before: { status: 'APPROVED' },
      after: { status: 'FAILED', reason: dto.reason },
    });
    this.logger.warn(`Admin ${adminId} marked withdrawal ${withdrawalId} failed and returned the money: ${dto.reason}`);

    return this.withdrawalRepository.findById(withdrawalId);
  }

  /**
   * Holds a new withdrawal for manual review instead of PENDING when either
   *  - the requesting device's risk score is at or above DEVICE_RISK_HOLD_THRESHOLD, or
   *  - the account is tied to other accounts by a PAN, a bank account or (two or more) devices, which is what
   *    one person cashing out several accounts looks like.
   * Fails open to PENDING (never blocks a legitimate withdrawal) whenever
   * the context is missing or a check cannot run — this is a fraud signal, not
   * a security gate, and a person reviews everything it holds.
   */
  private async resolveInitialStatus(
    userId: string,
    deviceId?: string,
  ): Promise<{ status: 'PENDING' | 'UNDER_REVIEW'; reason?: string }> {
    const device = deviceId ? await this.deviceRepository.findById(deviceId) : null;
    if (device && device.userId === userId && device.riskScore >= DEVICE_RISK_HOLD_THRESHOLD) {
      this.logger.warn(
        `Withdrawal from user ${userId} held for review — device ${deviceId} risk score ${device.riskScore}`,
      );
      return { status: 'UNDER_REVIEW', reason: 'high_device_risk_score' };
    }

    try {
      const linkage = await this.accountLinkage.assess(userId);
      if (linkage.holdRecommended) {
        this.logger.warn(
          `Withdrawal from user ${userId} held for review — linked to ${linkage.accounts.length} other account(s) (${linkage.points} link points)`,
        );
        return { status: 'UNDER_REVIEW', reason: 'linked_accounts' };
      }
    } catch (error) {
      this.logger.error(`Linked-account check failed for user ${userId}; not holding: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { status: 'PENDING' };
  }

  /**
   * Fires the actual RazorpayX payout for an approved withdrawal. A contact +
   * fund account is created fresh on every call rather than cached against
   * the bank account — Razorpay allows duplicates, and caching would need a
   * schema change this phase intentionally skips (see project notes).
   */
  private async initiatePayout(withdrawalId: string) {
    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) return;

    if (!withdrawal.bankAccount) {
      this.logger.error(`Withdrawal ${withdrawal.id} was approved with no bank account on file — payout not attempted`);
      return;
    }

    try {
      const customer = await this.paymentService.createCustomer({ name: withdrawal.bankAccount.accountHolderName });
      const fundAccount = await this.paymentService.createFundAccount({
        customerId: customer.id,
        accountHolderName: withdrawal.bankAccount.accountHolderName,
        accountNumber: withdrawal.bankAccount.accountNumber,
        ifscCode: withdrawal.bankAccount.ifscCode,
      });
      const payout = await this.paymentService.createPayout({
        fundAccountId: fundAccount.id,
        amountInRupees: Number(withdrawal.finalAmount),
        referenceId: withdrawal.id,
      });

      const outcome = await this.settlementRepository.markProcessing({
        withdrawalId: withdrawal.id,
        metadata: { razorpayPayoutId: payout.id, razorpayFundAccountId: fundAccount.id },
      });
      if (!outcome.applied) {
        this.logger.error(`Payout ${payout.id} was created for withdrawal ${withdrawal.id} but it is already ${outcome.status}. Check it by hand.`);
      }
    } catch (error) {
      const message = describeError(error);
      this.logger.error(`RazorpayX payout failed to initiate for withdrawal ${withdrawal.id}: ${message}`);
      // Kept, not lost: an approved withdrawal with this note is offered to an admin to pay by hand.
      const existing = withdrawal.metadata && typeof withdrawal.metadata === 'object' && !Array.isArray(withdrawal.metadata) ? withdrawal.metadata : {};
      await this.withdrawalRepository.update(withdrawal.id, { metadata: { ...existing, payoutInitiationError: message } });
    }
  }
}
