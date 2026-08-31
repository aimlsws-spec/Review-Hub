import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { RazorpayService } from '../../payment/services';
import { UserKycService } from '../../user-kyc/services';
import { REVIEWABLE_WITHDRAWAL_STATUSES, WALLET_CONSTANTS } from '../constants';
import { CreateWithdrawalDto, RejectWithdrawalDto } from '../dto';
import { WithdrawalRequestedEvent, WithdrawalReviewedEvent } from '../events';
import { UserBankAccountRepository, UserWalletRepository, WithdrawalRepository } from '../repositories';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly withdrawalRepository: WithdrawalRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly bankRepository: UserBankAccountRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
    private readonly razorpayService: RazorpayService,
    private readonly userKycService: UserKycService,
  ) {}

  async request(userId: string, dto: CreateWithdrawalDto) {
    if (dto.amount < WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(`Minimum withdrawal amount is ₹${WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT}`);
    }

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

    const wallet = await this.walletRepository.getOrCreate(userId);
    if (Number(wallet.availableBalance) < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const withdrawal = await this.withdrawalRepository.create({
      wallet: { connect: { id: wallet.id } },
      bankAccount: { connect: { id: bankAccount.id } },
      amount: dto.amount,
      finalAmount: dto.amount,
      status: 'PENDING',
    });

    try {
      await this.walletRepository.holdForWithdrawal({
        walletId: wallet.id,
        amount: dto.amount,
        withdrawalId: withdrawal.id,
      });
    } catch (error) {
      // The pre-check above already validated the balance; this only
      // catches a genuine race against a concurrent request. Undo the
      // request row we just created rather than leaving it stranded PENDING
      // with no hold behind it.
      await this.withdrawalRepository.update(withdrawal.id, {
        status: 'CANCELLED',
        rejectionReason: 'Insufficient balance at time of processing',
        deletedAt: new Date(),
      });
      throw error;
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

  /** Minimal reviewer action — Phase 5 builds the admin withdrawal queue around this. */
  async approve(withdrawalId: string, reviewerId: string) {
    const withdrawal = await this.getReviewable(withdrawalId);

    await this.walletRepository.finalizeWithdrawal({
      walletId: withdrawal.walletId,
      amount: Number(withdrawal.amount),
      withdrawalId: withdrawal.id,
    });

    await this.withdrawalRepository.update(withdrawalId, {
      status: 'APPROVED',
      processedBy: reviewerId,
      processedAt: new Date(),
    });

    await this.withdrawalRepository.createLog({
      withdrawal: { connect: { id: withdrawalId } },
      oldStatus: withdrawal.status,
      newStatus: 'APPROVED',
      changedBy: reviewerId,
    });

    this.eventEmitter.emit(
      'wallet.withdrawal.approved',
      new WithdrawalReviewedEvent(withdrawalId, withdrawal.wallet.userId, true),
    );

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawalId,
      action: 'APPROVE',
      before: { status: withdrawal.status },
      after: { status: 'APPROVED' },
    });

    // Money has already left the user's balance (finalizeWithdrawal above) —
    // a payout failure here doesn't get reversed until Razorpay's webhook
    // reports it definitively failed/reversed (see PayoutListener), since an
    // API error at this exact moment could just as easily be a transient blip.
    await this.initiatePayout(withdrawal);

    return this.withdrawalRepository.findById(withdrawalId);
  }

  async reject(withdrawalId: string, reviewerId: string, dto: RejectWithdrawalDto) {
    const withdrawal = await this.getReviewable(withdrawalId);

    await this.walletRepository.releaseHold({
      walletId: withdrawal.walletId,
      amount: Number(withdrawal.amount),
      withdrawalId: withdrawal.id,
    });

    const updated = await this.withdrawalRepository.update(withdrawalId, {
      status: 'REJECTED',
      rejectionReason: dto.rejectionReason,
      processedBy: reviewerId,
      processedAt: new Date(),
    });

    await this.withdrawalRepository.createLog({
      withdrawal: { connect: { id: withdrawalId } },
      oldStatus: withdrawal.status,
      newStatus: 'REJECTED',
      remarks: dto.rejectionReason,
      changedBy: reviewerId,
    });

    this.eventEmitter.emit(
      'wallet.withdrawal.rejected',
      new WithdrawalReviewedEvent(withdrawalId, withdrawal.wallet.userId, false),
    );

    await this.auditLogService.record({
      actorId: reviewerId,
      actorType: 'ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawalId,
      action: 'REJECT',
      before: { status: withdrawal.status },
      after: { status: 'REJECTED', reason: dto.rejectionReason },
    });

    return updated;
  }

  private async getReviewable(withdrawalId: string) {
    const withdrawal = await this.withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) throw new NotFoundException('Withdrawal request');
    if (!REVIEWABLE_WITHDRAWAL_STATUSES.includes(withdrawal.status)) {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }
    return withdrawal;
  }

  /**
   * Fires the actual RazorpayX payout for an approved withdrawal. A contact +
   * fund account is created fresh on every call rather than cached against
   * the bank account — Razorpay allows duplicates, and caching would need a
   * schema change this phase intentionally skips (see project notes).
   */
  private async initiatePayout(withdrawal: NonNullable<Awaited<ReturnType<WithdrawalRepository['findById']>>>) {
    if (!withdrawal.bankAccount) {
      this.logger.error(`Withdrawal ${withdrawal.id} was approved with no bank account on file — payout not attempted`);
      return;
    }

    try {
      const customer = await this.razorpayService.createCustomer({ name: withdrawal.bankAccount.accountHolderName });
      const fundAccount = await this.razorpayService.createFundAccount({
        customerId: customer.id,
        accountHolderName: withdrawal.bankAccount.accountHolderName,
        accountNumber: withdrawal.bankAccount.accountNumber,
        ifscCode: withdrawal.bankAccount.ifscCode,
      });
      const payout = await this.razorpayService.createPayout({
        fundAccountId: fundAccount.id,
        amountInRupees: Number(withdrawal.finalAmount),
        referenceId: withdrawal.id,
      });

      await this.withdrawalRepository.update(withdrawal.id, {
        status: 'PROCESSING',
        metadata: { razorpayPayoutId: payout.id, razorpayFundAccountId: fundAccount.id },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`RazorpayX payout failed to initiate for withdrawal ${withdrawal.id}: ${message}`);
      await this.withdrawalRepository.update(withdrawal.id, { metadata: { payoutInitiationError: message } });
    }
  }
}
