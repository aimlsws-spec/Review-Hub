import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AnalyticsEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AnalyticsEventCreateInput) {
    return this.prisma.analyticsEvent.create({ data });
  }

  async findAll(params: {
    page: number;
    limit: number;
    eventName?: string;
    eventCategory?: string;
    merchantId?: string;
    campaignId?: string;
  }) {
    const { page, limit, eventName, eventCategory, merchantId, campaignId } = params;
    const where: Prisma.AnalyticsEventWhereInput = { deletedAt: null };
    if (eventName) where.eventName = eventName;
    if (eventCategory) where.eventCategory = eventCategory;
    if (merchantId) where.merchantId = merchantId;
    if (campaignId) where.campaignId = campaignId;

    const [data, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
