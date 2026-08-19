import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

  async findPublic(params: { page: number; limit: number; campaignType?: string; search?: string }) {
    const { page, limit, campaignType, search } = params;
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

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
