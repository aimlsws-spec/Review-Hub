import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantBankRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchantId(merchantId: string) {
    return this.prisma.merchantBankAccount.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.merchantBankAccount.findUnique({ where: { id } });
  }

  async findPrimary(merchantId: string) {
    return this.prisma.merchantBankAccount.findFirst({
      where: { merchantId, isPrimary: true, deletedAt: null },
    });
  }

  async countByMerchantId(merchantId: string) {
    return this.prisma.merchantBankAccount.count({ where: { merchantId, deletedAt: null } });
  }

  async create(data: Prisma.MerchantBankAccountCreateInput) {
    return this.prisma.merchantBankAccount.create({ data });
  }

  async update(id: string, data: Prisma.MerchantBankAccountUpdateInput) {
    return this.prisma.merchantBankAccount.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.merchantBankAccount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async unsetPrimaryForMerchant(merchantId: string, excludeId?: string) {
    const where: Prisma.MerchantBankAccountWhereInput = { merchantId, isPrimary: true, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.merchantBankAccount.updateMany({
      where,
      data: { isPrimary: false },
    });
  }
}
