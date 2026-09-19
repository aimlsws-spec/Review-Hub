import { Injectable } from '@nestjs/common';
import { Prisma, TargetGender } from '@prisma/client';

import { CampaignSort } from '@common/enums';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CampaignCreateInput) {
    return this.prisma.campaign.create({ data });
  }

  async findById(id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: { tasks: true, media: true, targets: true },
    });
  }

  async getAnalytics(id: string) {
    return this.prisma.campaignAnalytics.findUnique({
      where: { campaignId: id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.campaign.findUnique({ where: { slug } });
  }

  async update(id: string, data: Prisma.CampaignUpdateInput) {
    return this.prisma.campaign.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByMerchant(params: { merchantId: string; page: number; limit: number; status?: string }) {
    const { merchantId, page, limit, status } = params;
    const where: Prisma.CampaignWhereInput = { merchantId, deletedAt: null };
    if (status) where.status = status as never;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createApproval(data: Prisma.CampaignApprovalCreateInput) {
    return this.prisma.campaignApproval.create({ data });
  }

  async findPendingReview(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const where: Prisma.CampaignWhereInput = { status: 'PENDING_REVIEW', deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findPublic(params: { page: number; limit: number; campaignType?: string; search?: string; sort?: CampaignSort }) {
    const { page, limit, campaignType, search, sort } = params;
    const where: Prisma.CampaignWhereInput = {
      deletedAt: null,
      status: 'ACTIVE' as never,
      visibility: 'PUBLIC' as never,
    };
    if (campaignType) where.campaignType = campaignType as never;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    /** Ranks by `joins` — the least gameable, least lag-prone "people are choosing this now" signal, unlike `completions` which lags behind actual popularity. */
    const orderBy: Prisma.CampaignOrderByWithRelationInput[] =
      sort === CampaignSort.Popular
        ? [{ analytics: { joins: 'desc' } }, { featured: 'desc' }, { createdAt: 'desc' }]
        : [{ featured: 'desc' }, { createdAt: 'desc' }];

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findAvailableForUser(params: {
    userId: string;
    page: number;
    limit: number;
    age?: number;
    gender?: string;
    followers?: number;
    level?: number;
    countryId?: string;
    stateId?: string;
    cityId?: string;
  }) {
    const { page, limit, age, gender, followers = 0, level = 0, countryId, stateId, cityId } = params;
    
    // Core query: Campaign is ACTIVE, PUBLIC, and budget is available
    const where: Prisma.CampaignWhereInput = {
      deletedAt: null,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      remainingBudget: { gt: 0 },
      // Target matching
      targets: {
        some: {
          AND: [
            // Age conditions
            age ? {
              OR: [
                { minimumAge: null, maximumAge: null },
                { minimumAge: { lte: age }, maximumAge: null },
                { minimumAge: null, maximumAge: { gte: age } },
                { minimumAge: { lte: age }, maximumAge: { gte: age } },
              ]
            } : { minimumAge: null, maximumAge: null },
            // Gender condition
            gender ? {
              OR: [
                { gender: 'ALL' },
                { gender: gender as TargetGender },
              ]
            } : { gender: 'ALL' },
            // Minimums
            { minimumFollowers: { lte: followers } },
            { minimumLevel: { lte: level } },
            // Location matching
            {
              OR: [
                { countryId: null, stateId: null, cityId: null },
                countryId ? { countryId } : {},
                stateId ? { stateId } : {},
                cityId ? { cityId } : {},
              ]
            }
          ]
        }
      }
    };

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
