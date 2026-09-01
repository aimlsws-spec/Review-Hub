import { Injectable } from '@nestjs/common';
import { Prisma, WalletTransactionType } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class UserWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.userWallet.findUnique({ where: { userId } });
  }

  async getOrCreate(userId: string) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return this.prisma.userWallet.create({ data: { user: { connect: { id: userId } } } });
  }

  async findTransactions(walletId: string, page: number, limit: number, type?: WalletTransactionType) {
    const where: Prisma.WalletTransactionWhereInput = { walletId };
    if (type) where.type = type;

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

  /** Credits the available balance immediately — used for rewards and referral bonuses. */
  async creditAvailable(params: {
    walletId: string;
    amount: number;
    type: WalletTransactionType;
    referenceType?: string;
    referenceId?: string;
    remarks?: string;
  }) {
    const { walletId, amount, type, referenceType, referenceId, remarks } = params;

    return this.prisma.transaction(async (tx) => {
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
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

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Debits the available balance immediately, in one step (no hold) — for
   * marketplace redemptions, which are instant rather than admin-reviewed
   * like a withdrawal. Validated inside the transaction, not before it, so
   * two concurrent redemptions can't both pass a balance check against the
   * same stale read.
   */
  async debitForRedemption(params: { walletId: string; amount: number; referenceType: string; referenceId: string; remarks?: string }) {
    const { walletId, amount, referenceType, referenceId, remarks } = params;

    return this.prisma.transaction(async (tx) => {
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
    const { walletId, amount, withdrawalId } = params;

    return this.prisma.transaction(async (tx) => {
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
      if (Number(wallet.availableBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceBefore = wallet.availableBalance;
      const availableAfter = Number(balanceBefore) - amount;

      await tx.userWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: availableAfter,
          lockedBalance: { increment: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type: 'HOLD',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: availableAfter,
          referenceType: 'WithdrawalRequest',
          referenceId: withdrawalId,
        },
      });
    });
  }

  /** Releases a held amount back to available balance — a rejected or cancelled withdrawal. */
  async releaseHold(params: { walletId: string; amount: number; withdrawalId: string }) {
    const { walletId, amount, withdrawalId } = params;

    return this.prisma.transaction(async (tx) => {
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + amount;

      await tx.userWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: balanceAfter,
          lockedBalance: { decrement: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type: 'RELEASE',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'WithdrawalRequest',
          referenceId: withdrawalId,
        },
      });
    });
  }

  /**
   * Undoes a finalized withdrawal after the fact — the payout gateway
   * reported it definitively failed or was reversed post-approval, so the
   * money that left `totalWithdrawn` needs to come back to available balance.
   */
  async reverseFinalizedWithdrawal(params: { walletId: string; amount: number; withdrawalId: string }) {
    const { walletId, amount, withdrawalId } = params;

    return this.prisma.transaction(async (tx) => {
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + amount;

      await tx.userWallet.update({
        where: { id: walletId },
        data: {
          availableBalance: balanceAfter,
          totalWithdrawn: { decrement: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type: 'REFUND',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'WithdrawalRequest',
          referenceId: withdrawalId,
          remarks: 'Payout failed or was reversed by the gateway after approval',
        },
      });
    });
  }

  /** Clears a held amount for good — an approved withdrawal moving toward payout. */
  async finalizeWithdrawal(params: { walletId: string; amount: number; withdrawalId: string }) {
    const { walletId, amount, withdrawalId } = params;

    return this.prisma.transaction(async (tx) => {
      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
      const balanceBefore = wallet.lockedBalance;
      const lockedAfter = Number(balanceBefore) - amount;

      await tx.userWallet.update({
        where: { id: walletId },
        data: {
          lockedBalance: lockedAfter,
          totalWithdrawn: { increment: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          wallet: { connect: { id: walletId } },
          type: 'WITHDRAWAL',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: lockedAfter,
          referenceType: 'WithdrawalRequest',
          referenceId: withdrawalId,
        },
      });
    });
  }
}
