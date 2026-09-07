import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchant(merchantId: string) {
    return this.prisma.merchantAnalytics.findUnique({ where: { merchantId } });
  }

  async upsertForMerchant(
    merchantId: string,
    data: Prisma.MerchantAnalyticsUpdateInput & Omit<Prisma.MerchantAnalyticsCreateInput, 'merchant'>,
  ) {
    return this.prisma.merchantAnalytics.upsert({
      where: { merchantId },
      create: { ...data, merchant: { connect: { id: merchantId } } },
      update: data,
    });
  }
}
