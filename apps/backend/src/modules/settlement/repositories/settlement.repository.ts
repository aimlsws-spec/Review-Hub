import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchant(merchantId: string, page: number, limit: number) {
    const where = { merchantId };
    const [data, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { periodStart: 'desc' },
        include: { invoice: true },
      }),
      this.prisma.settlement.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.settlement.findUnique({ where: { id }, include: { invoice: true } });
  }

  /** Merchants whose wallet had any activity in the period — the only ones worth generating a settlement for. */
  async findMerchantIdsActiveInPeriod(periodStart: Date, periodEnd: Date): Promise<string[]> {
    const rows = await this.prisma.walletTransaction.findMany({
      where: { merchantWalletId: { not: null }, createdAt: { gte: periodStart, lt: periodEnd } },
      distinct: ['merchantWalletId'],
      select: { merchantWallet: { select: { merchantId: true } } },
    });
    return rows.filter((row) => row.merchantWallet).map((row) => row.merchantWallet!.merchantId);
  }

  /** Idempotent — a settlement already generated for this merchant/period is returned as-is, never regenerated. */
  async generateForMerchant(params: { merchantId: string; periodStart: Date; periodEnd: Date }) {
    const { merchantId, periodStart, periodEnd } = params;

    const existing = await this.prisma.settlement.findUnique({
      where: { merchantId_periodStart_periodEnd: { merchantId, periodStart, periodEnd } },
    });
    if (existing) return existing;

    const wallet = await this.prisma.merchantWallet.findUnique({ where: { merchantId } });
    if (!wallet) return null;

    const merchant = await this.prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });

    const [toppedUp, spent] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { merchantWalletId: wallet.id, type: 'CREDIT', status: 'SUCCESS', createdAt: { gte: periodStart, lt: periodEnd } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { merchantWalletId: wallet.id, type: 'SPEND', status: 'SUCCESS', createdAt: { gte: periodStart, lt: periodEnd } },
        _sum: { amount: true },
      }),
    ]);

    const totalToppedUp = Number(toppedUp._sum.amount ?? 0);
    const totalSpent = Number(spent._sum.amount ?? 0);
    const commissionRate = Number(merchant.commissionRate);
    const commissionAmount = totalSpent * commissionRate;

    return this.prisma.settlement.create({
      data: {
        merchant: { connect: { id: merchantId } },
        periodStart,
        periodEnd,
        totalToppedUp,
        totalSpent,
        commissionRate,
        commissionAmount,
      },
    });
  }
}
