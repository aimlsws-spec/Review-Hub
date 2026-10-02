import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BankDetailsProtector } from '../../../shared/crypto';

/** Refunds come back with their bank account masked, except from `findByIdForPayout`. */
@Injectable()
export class MerchantRefundRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protector: BankDetailsProtector,
  ) {}

  async create(data: Prisma.MerchantRefundRequestCreateInput) {
    return this.prisma.merchantRefundRequest.create({ data });
  }

  async findById(id: string) {
    const refund = await this.findWithBankAccount(id);
    return refund ? this.protector.maskNested(refund) : null;
  }

  /** With the real account number: only for sending the payout to the gateway. */
  async findByIdForPayout(id: string) {
    const refund = await this.findWithBankAccount(id);
    return refund ? this.protector.revealNested(refund) : null;
  }

  private findWithBankAccount(id: string) {
    return this.prisma.merchantRefundRequest.findFirst({
      where: { id, deletedAt: null },
      include: { merchantWallet: true, bankAccount: true, logs: true },
    });
  }

  async update(id: string, data: Prisma.MerchantRefundRequestUpdateInput) {
    return this.prisma.merchantRefundRequest.update({ where: { id }, data });
  }

  async findByMerchantWalletId(params: { merchantWalletId: string; page: number; limit: number }) {
    const { merchantWalletId, page, limit } = params;
    const where: Prisma.MerchantRefundRequestWhereInput = { merchantWalletId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.merchantRefundRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchantRefundRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findPendingForAdmin(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const where: Prisma.MerchantRefundRequestWhereInput = {
      status: { in: ['PENDING', 'UNDER_REVIEW'] },
      deletedAt: null,
    };

    const [rows, total] = await Promise.all([
      this.prisma.merchantRefundRequest.findMany({
        where,
        include: { merchantWallet: true, bankAccount: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.merchantRefundRequest.count({ where }),
    ]);

    return { data: rows.map((row) => this.protector.maskNested(row)), total, page, limit };
  }

  async createLog(data: Prisma.MerchantRefundLogCreateInput) {
    return this.prisma.merchantRefundLog.create({ data });
  }
}
