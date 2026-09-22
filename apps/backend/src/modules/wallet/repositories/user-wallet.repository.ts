import { Injectable } from '@nestjs/common';
import { Prisma, WalletTransactionType } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';
import { getIstDayBoundaries } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { lockUserWallet } from '../../../database/prisma/row-lock';
import { TransactionFilter, transactionWhere } from '../transaction-filter';

import { finalizeInTx, holdInTx, releaseInTx, reverseInTx } from './withdrawal-ledger';

@Injectable()
export class UserWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.userWallet.findUnique({ where: { userId } });
  }

  /**
   * The user's wallet, created on first use. Two requests can both find no wallet and both try to create one; the
   * loser hits the unique constraint on the user. That is not a failure (the wallet exists now), so it returns the
   * winner's wallet instead of a 500.
   */
  async getOrCreate(userId: string) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    try {
      return await this.prisma.userWallet.create({ data: { user: { connect: { id: userId } } } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const created = await this.findByUserId(userId);
        if (created) return created;
      }
      throw error;
    }
  }

  async findTransactions(walletId: string, page: number, limit: number, filter: TransactionFilter = {}) {
    const where = transactionWhere(walletId, filter);

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * The newest transactions under a filter, for a downloaded statement. Asks for one more than [limit] so the caller can
   * tell a history that fits from one that was cut.
   */
  async findForExport(walletId: string, filter: TransactionFilter, limit: number) {
    return this.prisma.walletTransaction.findMany({
      where: transactionWhere(walletId, filter),
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
  }

  /** Sum of today's (IST) successful credits — powers the "Today's Earnings" home screen figure. */
  async getTodayEarnings(walletId: string): Promise<Prisma.Decimal> {
    const { start, end } = getIstDayBoundaries();
    const result = await this.prisma.walletTransaction.aggregate({
      where: { walletId, type: 'CREDIT', status: 'SUCCESS', createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  /**
   * Credits the available balance immediately — used for rewards and referral bonuses.
   *
   * With `idempotent: true` and a reference, a credit that is already in the ledger for that same reference is not
   * applied a second time: the existing entry is returned with `alreadyApplied: true`. That lets a job that failed
   * part-way be retried safely. It is opt-in because some callers reuse one reference for several genuine credits.
   */
  async creditAvailable(params: {
    walletId: string;
    amount: number;
    type: WalletTransactionType;
    referenceType?: string;
    referenceId?: string;
    remarks?: string;
    idempotent?: boolean;
  }) {
    const { walletId, amount, type, referenceType, referenceId, remarks, idempotent } = params;

    return this.prisma.transaction(async (tx) => {
      await lockUserWallet(tx, walletId);
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });

      if (idempotent && referenceType && referenceId) {
        const existing = await tx.walletTransaction.findFirst({
          where: { walletId, type, referenceType, referenceId, status: 'SUCCESS' },
        });
        if (existing) return { wallet, transaction: existing, alreadyApplied: true };
      }

      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + amount;

      const updatedWallet = await tx.userWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: balanceAfter,
          lifetimeEarnings: { increment: amount },
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type,
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType,
          referenceId,
          remarks,
        },
      });

      return { wallet: updatedWallet, transaction, alreadyApplied: false };
    });
  }

  /**
   * Debits the available balance immediately, in one step (no hold) — for
   * marketplace redemptions, which are instant rather than admin-reviewed
   * like a withdrawal. Validated inside the transaction, not before it, so
   * two concurrent redemptions can't both pass a balance check against the
   * same stale read.
   */
  /**
   * Claws back a fraudulently-credited reward. Unlike debitForRedemption,
   * this never throws on insufficient balance — it recovers whatever is
   * currently available (down to 0, never negative) and reports the
   * uncollected remainder as a shortfall for the caller to record, rather
   * than blocking the reversal on the user having spent/withdrawn the money.
   */
  async clawbackReward(params: { walletId: string; amount: number; referenceId: string; remarks?: string }) {
    const { walletId, amount, referenceId, remarks } = params;

    return this.prisma.transaction(async (tx) => {
      await lockUserWallet(tx, walletId);
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
      const balanceBefore = wallet.availableBalance;
      const recoverable = Math.min(amount, Number(balanceBefore));
      const shortfall = amount - recoverable;
      const balanceAfter = Number(balanceBefore) - recoverable;

      await tx.userWallet.update({
        where: { id: walletId },
        data: { availableBalance: balanceAfter },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type: 'CLAWBACK',
          status: 'SUCCESS',
          amount: recoverable,
          balanceBefore,
          balanceAfter,
          referenceType: 'Reward',
          referenceId,
          remarks,
        },
      });

      return { transaction, recoverable, shortfall };
    });
  }

  async debitForRedemption(params: { walletId: string; amount: number; referenceType: string; referenceId: string; remarks?: string }) {
    const { walletId, amount, referenceType, referenceId, remarks } = params;

    return this.prisma.transaction(async (tx) => {
      await lockUserWallet(tx, walletId);
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
      if (Number(wallet.availableBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) - amount;

      await tx.userWallet.update({
        where: { id: walletId },
        data: { availableBalance: balanceAfter },
      });

      return tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type: 'DEBIT',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType,
          referenceId,
          remarks,
        },
      });
    });
  }

  /**
   * Moves an amount from available to locked balance, for a pending
   * withdrawal request. Validated inside the transaction, not before it, so
   * two concurrent withdrawal requests can't both pass a balance check
   * against the same stale read.
   */
  async holdForWithdrawal(params: { walletId: string; amount: number; withdrawalId: string }) {
    return this.prisma.transaction((tx) => holdInTx(tx, params));
  }

  /** Releases a held amount back to available balance — a rejected or cancelled withdrawal. */
  async releaseHold(params: { walletId: string; amount: number; withdrawalId: string }) {
    return this.prisma.transaction((tx) => releaseInTx(tx, params));
  }

  /**
   * Undoes a finalized withdrawal after the fact — the payout gateway
   * reported it definitively failed or was reversed post-approval, so the
   * money that left `totalWithdrawn` needs to come back to available balance.
   */
  async reverseFinalizedWithdrawal(params: { walletId: string; amount: number; withdrawalId: string }) {
    return this.prisma.transaction((tx) => reverseInTx(tx, params, 'Payout failed or was reversed by the gateway after approval'));
  }

  /** Clears a held amount for good — an approved withdrawal moving toward payout. */
  async finalizeWithdrawal(params: { walletId: string; amount: number; withdrawalId: string }) {
    return this.prisma.transaction((tx) => finalizeInTx(tx, params));
  }
}
