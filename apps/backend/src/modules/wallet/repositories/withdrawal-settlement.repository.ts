import { Injectable } from '@nestjs/common';
import { PayoutMode, Prisma, WithdrawalStatus } from '@prisma/client';

import { BadRequestException, ConflictException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { getIstDayBoundaries, getIstMonthBoundaries } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { lockUserWallet, lockWithdrawalAndWallet } from '../../../database/prisma/row-lock';
import { LIMIT_COUNTED_STATUSES, MANUALLY_SETTLEABLE_STATUS, REVIEWABLE_WITHDRAWAL_STATUSES } from '../constants';
import { calculateTds, financialYearOf } from '../tds';

import { finalizeInTx, holdInTx, releaseInTx, reverseInTx } from './withdrawal-ledger';

type Tx = Prisma.TransactionClient;

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

/** What became of an attempt to settle a withdrawal that something else may already have settled. */
export type SettlementOutcome =
  | { applied: true; withdrawal: WithdrawalWithWallet }
  | { applied: false; reason: string; status: WithdrawalStatus };

type WithdrawalWithWallet = Prisma.WithdrawalRequestGetPayload<{ include: { wallet: true } }>;

/**
 * Every change to a withdrawal that moves money, each done in one transaction that first locks the withdrawal.
 *
 * WHY the lock: approving, rejecting, paying and failing all read the status, then move money, then write the status.
 * Two admins clicking at once, or an admin and the gateway's webhook, would both read "still pending" and both move the
 * money. With the row locked the second one waits, then sees the new status and stops. The status change and the ledger
 * entry also happen together, so neither can exist without the other.
 *
 * Lock order is withdrawal, then wallet (see database/prisma/row-lock.ts).
 */
@Injectable()
export class WithdrawalSettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a withdrawal and sets its amount aside in one transaction, after checking the balance and the daily and
   * monthly limits while the wallet is locked. A request that would go over is refused and leaves nothing behind.
   */
  async request(params: {
    walletId: string;
    bankAccountId: string;
    amount: number;
    status: 'PENDING' | 'UNDER_REVIEW';
    limits: { daily: number; monthly: number | null };
    now?: Date;
  }) {
    const { walletId, bankAccountId, amount, status, limits, now = new Date() } = params;

    return this.prisma.transaction(async (tx) => {
      await lockUserWallet(tx, walletId);

      const day = getIstDayBoundaries(now);
      const month = getIstMonthBoundaries(now);
      const today = await this.requestedSince(tx, walletId, day.start);
      this.assertWithinLimit('daily', today, amount, limits.daily);
      if (limits.monthly !== null) {
        this.assertWithinLimit('monthly', await this.requestedSince(tx, walletId, month.start), amount, limits.monthly);
      }

      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          wallet: { connect: { id: walletId } },
          bankAccount: { connect: { id: bankAccountId } },
          amount,
          finalAmount: amount,
          status,
        },
      });
      await holdInTx(tx, { walletId, amount, withdrawalId: withdrawal.id });
      return withdrawal;
    });
  }

  /**
   * Approves a withdrawal and takes the money out of the user's wallet for good, both or neither. When the platform
   * keeps tax back from payouts, the tax is worked out here, in the same step, and the amount that reaches the user
   * (`finalAmount`) is set to what is left.
   */
  async approve(params: {
    withdrawalId: string;
    reviewerId: string;
    payoutMode: PayoutMode;
    tds?: { rate: number; threshold: number; section: string | null };
  }): Promise<WithdrawalWithWallet> {
    const { withdrawalId, reviewerId, payoutMode, tds } = params;

    return this.prisma.transaction(async (tx) => {
      const withdrawal = await this.lockAndRead(tx, withdrawalId);
      this.assertReviewable(withdrawal);

      const now = new Date();
      const amount = Number(withdrawal.amount);
      const deduction = tds && tds.rate > 0 ? await this.deductTds(tx, withdrawal, amount, now, { ...tds, rate: tds.rate }) : null;

      await finalizeInTx(tx, { walletId: withdrawal.walletId, amount, withdrawalId });
      return this.transition(tx, withdrawal, 'APPROVED', {
        processedBy: reviewerId,
        processedAt: now,
        payoutMode,
        ...(deduction ? { tdsAmount: deduction, finalAmount: Math.round((amount - deduction) * 100) / 100 } : {}),
      });
    });
  }

  /** Rejects a withdrawal and gives the held amount back to the user's available balance, both or neither. */
  async reject(params: { withdrawalId: string; reviewerId: string; reason: string }): Promise<WithdrawalWithWallet> {
    const { withdrawalId, reviewerId, reason } = params;

    return this.prisma.transaction(async (tx) => {
      const withdrawal = await this.lockAndRead(tx, withdrawalId);
      this.assertReviewable(withdrawal);

      await releaseInTx(tx, { walletId: withdrawal.walletId, amount: Number(withdrawal.amount), withdrawalId });
      return this.transition(
        tx,
        withdrawal,
        'REJECTED',
        { rejectionReason: reason, processedBy: reviewerId, processedAt: new Date() },
        reason,
      );
    });
  }

  /** The gateway has taken the payout: approved becomes processing. A no-op if it is no longer approved. */
  async markProcessing(params: { withdrawalId: string; metadata: Prisma.InputJsonObject }): Promise<SettlementOutcome> {
    return this.prisma.transaction(async (tx) => {
      const withdrawal = await this.lockAndRead(tx, params.withdrawalId);
      if (withdrawal.status !== 'APPROVED') return { applied: false, reason: 'not_approved', status: withdrawal.status };

      const updated = await this.transition(tx, withdrawal, 'PROCESSING', {
        metadata: { ...this.metadataOf(withdrawal), ...params.metadata },
      });
      return { applied: true, withdrawal: updated };
    });
  }

  /**
   * Records that the money reached the user. `MANUAL` is an admin who sent it and typed in the bank's reference;
   * `GATEWAY` is the gateway's own report. The reference is unique: one bank transfer settles one withdrawal.
   */
  async markPaid(params: {
    withdrawalId: string;
    source: PayoutMode;
    reference?: string;
    paidAt?: Date;
    actorId?: string;
    note?: string;
    metadata?: Prisma.InputJsonObject;
  }): Promise<SettlementOutcome> {
    const { withdrawalId, source, reference, paidAt = new Date(), actorId, note, metadata } = params;

    try {
      return await this.prisma.transaction(async (tx) => {
        const withdrawal = await this.lockAndRead(tx, withdrawalId);
        if (withdrawal.status === 'PAID') return { applied: false, reason: 'already_paid', status: withdrawal.status };
        const refusal = this.refuseSettlement(withdrawal, source);
        if (refusal) return refusal;

        const updated = await this.transition(
          tx,
          withdrawal,
          'PAID',
          {
            paidAt,
            payoutMode: source,
            payoutReference: reference,
            // processedBy stays the approver; the person who sent the money is kept beside the reference.
            metadata: { ...this.metadataOf(withdrawal), ...metadata, ...(actorId ? { paidBy: actorId } : {}), ...(note ? { paidNote: note } : {}) },
          },
          reference ? `Paid. Bank reference: ${reference}` : 'Paid',
          actorId,
        );
        return { applied: true, withdrawal: updated };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Payout', 'bank reference');
      }
      throw error;
    }
  }

  /**
   * Records that the payout did not happen, and gives the money back to the user's available balance. Done once:
   * a second report of the same failure finds the withdrawal already failed and changes nothing.
   */
  async markFailed(params: {
    withdrawalId: string;
    source: PayoutMode;
    reason: string;
    actorId?: string;
    metadata?: Prisma.InputJsonObject;
  }): Promise<SettlementOutcome> {
    const { withdrawalId, source, reason, actorId, metadata } = params;

    return this.prisma.transaction(async (tx) => {
      const withdrawal = await this.lockAndRead(tx, withdrawalId);
      const refusal = this.refuseSettlement(withdrawal, source);
      if (refusal) return refusal;

      // The money goes back to the user in full, so no tax was ever kept back from it.
      await tx.tdsDeduction.updateMany({ where: { withdrawalId, status: 'DEDUCTED' }, data: { status: 'REVERSED', reversedAt: new Date() } });
      await reverseInTx(
        tx,
        { walletId: withdrawal.walletId, amount: Number(withdrawal.amount), withdrawalId },
        source === 'MANUAL' ? 'Payout could not be sent, so the amount was returned to your wallet' : 'Payout failed or was reversed by the gateway after approval',
      );
      const updated = await this.transition(
        tx,
        withdrawal,
        'FAILED',
        { rejectionReason: reason, payoutMode: source, metadata: { ...this.metadataOf(withdrawal), ...metadata } },
        reason,
        actorId,
      );
      return { applied: true, withdrawal: updated };
    });
  }

  /** Approved withdrawals waiting for someone to send the money and record the reference. */
  async findAwaitingManualPayout(page: number, limit: number) {
    const where: Prisma.WithdrawalRequestWhereInput = {
      status: MANUALLY_SETTLEABLE_STATUS,
      deletedAt: null,
      OR: [{ payoutMode: 'MANUAL' }, { metadata: { path: '$.payoutInitiationError', not: Prisma.AnyNull } }],
    };
    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: { wallet: true, bankAccount: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { processedAt: 'asc' },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  private async lockAndRead(tx: Tx, withdrawalId: string): Promise<WithdrawalWithWallet> {
    // The wallet is locked with the withdrawal, before anything is read: the checks and the ledger entries that follow
    // then see the balance as the last transaction left it, not as it was when this one began.
    await lockWithdrawalAndWallet(tx, withdrawalId);
    const withdrawal = await tx.withdrawalRequest.findFirst({ where: { id: withdrawalId, deletedAt: null }, include: { wallet: true } });
    if (!withdrawal) throw new NotFoundException('Withdrawal request');
    return withdrawal;
  }

  /**
   * Works out the tax for this payout and records what a TDS return needs. Returns the tax kept back, or 0 when the
   * user's payouts for the year are still under the threshold.
   *
   * The wallet is already locked (see lockAndRead), so two of one user's withdrawals approved at the same moment can not
   * each think the other has not been paid yet, and both slip under the threshold.
   */
  private async deductTds(
    tx: Tx,
    withdrawal: WithdrawalWithWallet,
    amount: number,
    now: Date,
    settings: { rate: number; threshold: number; section: string | null },
  ): Promise<number> {
    const year = financialYearOf(now);
    const paid = await tx.withdrawalRequest.aggregate({
      where: {
        walletId: withdrawal.walletId,
        id: { not: withdrawal.id },
        deletedAt: null,
        status: { in: ['APPROVED', 'PROCESSING', 'PAID'] },
        processedAt: { gte: year.start, lt: year.end },
      },
      _sum: { amount: true },
    });

    const tdsAmount = calculateTds({ rate: settings.rate, threshold: settings.threshold, alreadyPaidThisYear: Number(paid._sum.amount ?? 0), amount });
    if (tdsAmount <= 0) return 0;

    const pan = await tx.userKycDocument.findFirst({
      where: { userId: withdrawal.wallet.userId, documentType: 'PAN', verificationStatus: 'APPROVED', deletedAt: null },
      select: { documentNumber: true },
    });
    await tx.tdsDeduction.create({
      data: {
        withdrawal: { connect: { id: withdrawal.id } },
        userId: withdrawal.wallet.userId,
        financialYear: year.label,
        panNumber: pan?.documentNumber ?? null,
        section: settings.section ?? 'NOT SET',
        grossAmount: amount,
        rate: settings.rate,
        tdsAmount,
        netAmount: Math.round((amount - tdsAmount) * 100) / 100,
      },
    });
    return tdsAmount;
  }

  private assertReviewable(withdrawal: WithdrawalWithWallet): void {
    if (!REVIEWABLE_WITHDRAWAL_STATUSES.includes(withdrawal.status)) {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }
  }

  /**
   * Whether a paid or failed report may settle this withdrawal, or why not.
   *
   * A person may only settle one that is waiting on them: approved and set to be paid by hand, or approved where the
   * gateway could not start the payout. One the gateway already has (processing) is not theirs to settle, or it could
   * be paid twice. The gateway may settle one it has, or one it has only just been asked to pay.
   */
  private refuseSettlement(withdrawal: WithdrawalWithWallet, source: PayoutMode): SettlementOutcome | null {
    const { status } = withdrawal;
    if (source === 'GATEWAY') {
      return status === 'APPROVED' || status === 'PROCESSING' ? null : { applied: false, reason: `unexpected_${status.toLowerCase()}`, status };
    }

    if (status !== MANUALLY_SETTLEABLE_STATUS) {
      throw new BadRequestException(`This withdrawal is ${status.toLowerCase()}, so it can not be settled by hand.`);
    }
    if (withdrawal.payoutMode !== 'MANUAL' && !this.metadataOf(withdrawal).payoutInitiationError) {
      throw new BadRequestException('This withdrawal is being paid through the payment gateway, so it can not be settled by hand.');
    }
    return null;
  }

  /** Moves a withdrawal to a new status and writes the log entry for it, inside the caller's transaction. */
  private async transition(
    tx: Tx,
    withdrawal: WithdrawalWithWallet,
    to: WithdrawalStatus,
    data: Prisma.WithdrawalRequestUncheckedUpdateInput,
    remarks?: string,
    changedBy?: string,
  ): Promise<WithdrawalWithWallet> {
    const updated = await tx.withdrawalRequest.update({ where: { id: withdrawal.id }, data: { ...data, status: to }, include: { wallet: true } });
    await tx.withdrawalLog.create({
      data: {
        withdrawal: { connect: { id: withdrawal.id } },
        oldStatus: withdrawal.status,
        newStatus: to,
        remarks,
        changedBy: changedBy ?? (typeof data.processedBy === 'string' ? data.processedBy : undefined),
      },
    });
    return updated;
  }

  private metadataOf(withdrawal: { metadata: Prisma.JsonValue }): Prisma.InputJsonObject {
    const value = withdrawal.metadata;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Prisma.InputJsonObject) : {};
  }

  /** The total already requested since a moment, not counting requests that gave their money back. */
  private async requestedSince(tx: Tx, walletId: string, since: Date): Promise<number> {
    const total = await tx.withdrawalRequest.aggregate({
      where: { walletId, deletedAt: null, status: { in: [...LIMIT_COUNTED_STATUSES] }, createdAt: { gte: since } },
      _sum: { amount: true },
    });
    return Number(total._sum.amount ?? 0);
  }

  private assertWithinLimit(period: 'daily' | 'monthly', alreadyRequested: number, amount: number, limit: number): void {
    if (alreadyRequested + amount <= limit) return;

    const remaining = Math.max(0, limit - alreadyRequested);
    const label = period === 'daily' ? 'today' : 'this month';
    throw new BadRequestException(
      remaining > 0
        ? `This would go over your ${period} withdrawal limit of ${rupees(limit)}. You can withdraw up to ${rupees(remaining)} more ${label}.`
        : `You have reached your ${period} withdrawal limit of ${rupees(limit)}. Try again ${period === 'daily' ? 'tomorrow' : 'next month'}.`,
    );
  }
}
