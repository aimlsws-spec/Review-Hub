import { Injectable } from '@nestjs/common';
import { CampaignStatus, CampaignType, Prisma, TargetGender } from '@prisma/client';

import { CampaignSort } from '@common/enums';
import { haversineDistanceMeters } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** How many candidates the "nearest" sort scans before paginating in memory — distance can't be computed in SQL through Prisma, so this bounds the cost instead of loading every public campaign. */
const NEAREST_SORT_CANDIDATE_LIMIT = 500;

/** Has no end date, or ends later than now. */
const notEnded = (): Prisma.CampaignWhereInput => ({ OR: [{ endAt: null }, { endAt: { gt: new Date() } }] });

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CampaignCreateInput) {
    return this.prisma.campaign.create({ data });
  }

  async findById(id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      // Only live tasks, in the order participants do them: a removed task must not count towards "has tasks" or show
      // in the merchant's task list.
      include: { tasks: { where: { deletedAt: null }, orderBy: { taskOrder: 'asc' } }, media: true, targets: true },
    });
  }

  /** A campaign with everything a copy of it carries over: its live tasks, media, targets, categories and tags. */
  async findForDuplication(id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null }, orderBy: { taskOrder: 'asc' } },
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        targets: { where: { deletedAt: null } },
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
      },
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

  /**
   * One campaign for its own merchant: live tasks and media, and what each review decided and said. Which admin
   * reviewed it is internal, so their name is not included.
   */
  async findForOwner(id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null }, orderBy: { taskOrder: 'asc' } },
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        approvals: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { status: true, comments: true, createdAt: true } },
      },
    });
  }

  /**
   * Everything an admin needs to judge a campaign: its live tasks (QR codes included, since the admin checks them),
   * media, who the merchant is, and every earlier review with the reviewer's name. The merchant summary is limited to
   * what moderation needs; bank and KYC details stay on the merchant's own page.
   */
  async findForAdminReview(id: string) {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null }, orderBy: { taskOrder: 'asc' } },
        media: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        merchant: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
            status: true,
            verificationStatus: true,
            city: { select: { name: true } },
          },
        },
        approvals: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { status: true, comments: true, createdAt: true, reviewer: { select: { firstName: true, lastName: true } } },
        },
      },
    });
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

  /**
   * Every merchant's campaigns for the admin, in any status, newest first, each with the business that runs it.
   * `statusCounts` counts the same filters across every status, so the list's status tabs show how many each holds.
   */
  async findForAdmin(params: {
    page: number;
    limit: number;
    status?: CampaignStatus;
    campaignType?: CampaignType;
    merchantId?: string;
    search?: string;
  }) {
    const { page, limit, status, campaignType, merchantId, search } = params;
    const base: Prisma.CampaignWhereInput = { deletedAt: null };
    if (campaignType) base.campaignType = campaignType;
    if (merchantId) base.merchantId = merchantId;
    if (search) base.OR = [{ title: { contains: search } }, { merchant: { businessName: { contains: search } } }];
    const where: Prisma.CampaignWhereInput = status ? { ...base, status } : base;

    const [data, total, byStatus] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { merchant: { select: { id: true, businessName: true } } },
      }),
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    ]);

    const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Partial<Record<CampaignStatus, number>>;
    return { data, total, page, limit, statusCounts };
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
      // Past its end date it is over, even in the few minutes before the schedule job marks it EXPIRED.
      AND: [notEnded()],
    };
    if (campaignType) where.campaignType = campaignType as never;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    // A campaign with no end date never "ends soon", so that sort leaves those out instead of sorting nulls somewhere odd.
    if (sort === CampaignSort.EndingSoon) where.endAt = { not: null };

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
      where: { id, deletedAt: null, status: 'ACTIVE' as never, visibility: 'PUBLIC' as never, AND: [notEnded()] },
    });
  }

  /** SCHEDULED campaigns whose start time has come (CampaignScheduleService starts them). Oldest start first. */
  async findDueToStart(now: Date, take: number) {
    return this.prisma.campaign.findMany({
      where: { deletedAt: null, status: 'SCHEDULED' as never, startAt: { lte: now } },
      orderBy: { startAt: 'asc' },
      take,
      select: { id: true },
    });
  }

  /** Campaigns still running or waiting to run whose end date has passed (CampaignScheduleService expires them). */
  async findPastEnd(now: Date, take: number) {
    return this.prisma.campaign.findMany({
      where: { deletedAt: null, status: { in: ['SCHEDULED', 'ACTIVE', 'PAUSED'] as never }, endAt: { lte: now } },
      orderBy: { endAt: 'asc' },
      take,
      select: { id: true },
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
      AND: [notEnded()],
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
