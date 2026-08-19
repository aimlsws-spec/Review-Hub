import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchantId(merchantId: string) {
    return this.prisma.merchantWallet.findUnique({ where: { merchantId } });
  }

  async findTransactions(merchantWalletId: string, page: number, limit: number) {
    const where = { merchantWalletId };
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

  async createWallet(data: Prisma.MerchantWalletCreateInput) {
    return this.prisma.merchantWallet.create({ data });
  }

  async getOrCreate(merchantId: string) {
    const existing = await this.findByMerchantId(merchantId);
    if (existing) return existing;
    return this.createWallet({ merchant: { connect: { id: merchantId } } });
  }

  /**
   * Records a recharge attempt without moving any balance — the wallet is
   * only credited once the payment gateway confirms the payment actually
   * captured (see confirmTopUp), never at order-creation time.
   */
  async createPendingTopUp(params: { merchantWalletId: string; amount: number; razorpayOrderId: string }) {
    const { merchantWalletId, amount, razorpayOrderId } = params;
    const wallet = await this.prisma.merchantWallet.findUniqueOrThrow({ where: { id: merchantWalletId } });

    return this.prisma.walletTransaction.create({
      data: {
        merchantWallet: { connect: { id: merchantWalletId } },
        type: 'CREDIT',
        status: 'PENDING',
        amount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: wallet.availableBalance,
        referenceType: 'RazorpayOrder',
        referenceId: razorpayOrderId,
        remarks: 'Wallet recharge via Razorpay',
      },
    });
  }

  async findPendingTopUpByOrderId(razorpayOrderId: string) {
    return this.prisma.walletTransaction.findFirst({
      where: { referenceType: 'RazorpayOrder', referenceId: razorpayOrderId, status: 'PENDING' },
    });
  }

  /** Idempotent — a transaction that's already SUCCESS/FAILED is returned as-is rather than re-applied. */
  async confirmTopUp(transactionId: string, razorpayPaymentId: string) {
    return this.prisma.transaction(async (tx) => {
      const txn = await tx.walletTransaction.findUniqueOrThrow({ where: { id: transactionId } });
      if (txn.status !== 'PENDING' || !txn.merchantWalletId) return txn;

      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: txn.merchantWalletId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + Number(txn.amount);

      await tx.merchantWallet.update({
        where: { id: txn.merchantWalletId },
        data: { availableBalance: balanceAfter, totalTopUp: { increment: txn.amount } },
      });

      return tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'SUCCESS',
          balanceBefore,
          balanceAfter,
          metadata: { razorpayPaymentId },
        },
      });
    });
  }

  async failTopUp(transactionId: string, reason: string) {
    return this.prisma.walletTransaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED', remarks: reason },
    });
  }
}
