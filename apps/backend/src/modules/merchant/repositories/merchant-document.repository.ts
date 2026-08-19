import { Injectable } from '@nestjs/common';
import { MerchantDocumentType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchantId(merchantId: string) {
    return this.prisma.merchantDocument.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.merchantDocument.findUnique({ where: { id } });
  }

  async findByMerchantAndType(merchantId: string, documentType: MerchantDocumentType) {
    return this.prisma.merchantDocument.findFirst({
      where: { merchantId, documentType, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.MerchantDocumentCreateInput) {
    return this.prisma.merchantDocument.create({ data });
  }

  async update(id: string, data: Prisma.MerchantDocumentUpdateInput) {
    return this.prisma.merchantDocument.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.merchantDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
