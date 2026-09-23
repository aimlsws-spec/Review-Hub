import { Injectable } from '@nestjs/common';
import { Prisma, TargetGender } from '@prisma/client';

import { CampaignSort } from '@common/enums';
import { haversineDistanceMeters } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** How many candidates the "nearest" sort scans before paginating in memory — distance can't be computed in SQL through Prisma, so this bounds the cost instead of loading every public campaign. */
const NEAREST_SORT_CANDIDATE_LIMIT = 500;

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

  async findPublic(params: {
    page: number;
    limit: number;
    campaignType?: string;
    search?: string;
    sort?: CampaignSort;
    latitude?: number;
    longitude?: number;
  }) {
    const { page, limit, campaignType, search, sort, latitude, longitude } = params;
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

    // A campaign with no end date never "ends soon", so that sort leaves those out instead of sorting nulls somewhere odd.
    if (sort === CampaignSort.EndingSoon) where.endAt = { gte: new Date() };

    if (sort === CampaignSort.Nearest && latitude !== undefined && longitude !== undefined) {
      return this.findPublicNearest(where, { page, limit, latitude, longitude });
    }

    const orderBy = this.publicOrder(sort);

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

  /**
   * Distance from a merchant's store can't be computed in SQL through Prisma's query builder, so this pulls a bounded
   * batch of candidates, sorts them by distance in memory, and paginates that. A merchant with no location set sorts
   * last rather than being dropped from the results.
   */
  private async findPublicNearest(
    where: Prisma.CampaignWhereInput,
    params: { page: number; limit: number; latitude: number; longitude: number },
  ) {
    const { page, limit, latitude, longitude } = params;

    const candidatesQuery = this.prisma.campaign.findMany({
      where,
      take: NEAREST_SORT_CANDIDATE_LIMIT,
      orderBy: { createdAt: 'desc' },
      include: { merchant: { select: { latitude: true, longitude: true } } },
    });
    const [candidates, total] = await Promise.all([candidatesQuery, this.prisma.campaign.count({ where })]);

    const withDistance = candidates.map((campaign) => {
      const { merchant, ...rest } = campaign;
      const distanceMeters =
        merchant.latitude !== null && merchant.longitude !== null
          ? haversineDistanceMeters({ latitude, longitude }, { latitude: merchant.latitude, longitude: merchant.longitude })
          : null;
      return { ...rest, distanceMeters };
    });

    withDistance.sort((a, b) => {
      if (a.distanceMeters === null && b.distanceMeters === null) return 0;
      if (a.distanceMeters === null) return 1;
      if (b.distanceMeters === null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

    const data = withDistance.slice((page - 1) * limit, (page - 1) * limit + limit);

    // Pagination only ever runs over the candidate batch, so `total` is capped to match — otherwise a page past the
    // batch would look valid (a nonzero total) but always come back empty.
    return { data, total: Math.min(total, NEAREST_SORT_CANDIDATE_LIMIT), page, limit };
  }

  /**
   * One active, public campaign, for the app's detail page. Anything else (a draft, a paused or ended campaign, a
   * private one, one that does not exist) is the same "not found", so the endpoint can not be used to see what
   * is not meant to be seen.
   */
  async findPublicById(id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null, status: 'ACTIVE' as never, visibility: 'PUBLIC' as never },
    });
  }

  /** Every order ends with the newest, so equal campaigns keep a steady order from one request to the next. */
  private publicOrder(sort?: CampaignSort): Prisma.CampaignOrderByWithRelationInput[] {
    switch (sort) {
      // Ranks by `joins`: the least gameable, least lag-prone "people are choosing this now" signal, unlike `completions` which lags behind actual popularity.
      case CampaignSort.Popular:
        return [{ analytics: { joins: 'desc' } }, { featured: 'desc' }, { createdAt: 'desc' }];
      case CampaignSort.Newest:
        return [{ createdAt: 'desc' }];
      case CampaignSort.HighestReward:
        return [{ rewardAmount: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }];
      case CampaignSort.EndingSoon:
        return [{ endAt: 'asc' }, { createdAt: 'desc' }];
      default:
        return [{ featured: 'desc' }, { createdAt: 'desc' }];
    }
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
