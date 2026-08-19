import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class WithdrawalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WithdrawalRequestCreateInput) {
    return this.prisma.withdrawalRequest.create({ data });
  }

  async findById(id: string) {
    return this.prisma.withdrawalRequest.findFirst({
      where: { id, deletedAt: null },
      include: { wallet: true, bankAccount: true, logs: true },
    });
  }

  async update(id: string, data: Prisma.WithdrawalRequestUpdateInput) {
    return this.prisma.withdrawalRequest.update({ where: { id }, data });
  }

  async findByWalletId(params: { walletId: string; page: number; limit: number }) {
    const { walletId, page, limit } = params;
    const where: Prisma.WithdrawalRequestWhereInput = { walletId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findPendingForAdmin(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const where: Prisma.WithdrawalRequestWhereInput = {
      status: { in: ['PENDING', 'UNDER_REVIEW'] },
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: { wallet: true, bankAccount: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createLog(data: Prisma.WithdrawalLogCreateInput) {
    return this.prisma.withdrawalLog.create({ data });
  }
}
