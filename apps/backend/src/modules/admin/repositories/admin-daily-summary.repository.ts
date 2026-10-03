import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** Staff who receive the daily summary: super admins and admins. */
const SUMMARY_RECIPIENT_ROLE_SLUGS = ['super-admin', 'admin'];

@Injectable()
export class AdminDailySummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Task submissions approved, and task rewards credited (count and amount), in [start, end). */
  async activityBetween(start: Date, end: Date) {
    const [tasksApproved, rewards] = await Promise.all([
      this.prisma.taskSubmission.count({ where: { status: 'APPROVED', reviewedAt: { gte: start, lt: end }, deletedAt: null } }),
      this.prisma.reward.aggregate({
        where: { status: 'CREDITED', creditedAt: { gte: start, lt: end }, deletedAt: null },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);
    return { tasksApproved, rewardsCredited: rewards._count._all, rewardsAmount: Number(rewards._sum.amount ?? 0) };
  }

  /** The campaigns with the most rewards credited in [start, end), with their titles. */
  async topCampaignsBetween(start: Date, end: Date, take: number): Promise<Array<{ title: string; completions: number }>> {
    const groups = await this.prisma.reward.groupBy({
      by: ['campaignId'],
      where: { status: 'CREDITED', creditedAt: { gte: start, lt: end }, deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { campaignId: 'desc' } },
      take,
    });
    if (groups.length === 0) return [];
    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: groups.map((g) => g.campaignId) } },
      select: { id: true, title: true },
    });
    const titles = new Map(campaigns.map((c) => [c.id, c.title]));
    return groups.map((g) => ({ title: titles.get(g.campaignId) ?? 'A campaign', completions: g._count._all }));
  }

  /** Active super admins and admins, to send the summary to. */
  async findRecipientIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: 'ACTIVE', userRoles: { some: { role: { slug: { in: SUMMARY_RECIPIENT_ROLE_SLUGS } } } } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async findByDay(day: string) {
    return this.prisma.adminDailySummary.findUnique({ where: { day } });
  }

  async create(day: string, text: string, figures: Prisma.InputJsonValue) {
    return this.prisma.adminDailySummary.create({ data: { day, text, figures } });
  }

  async findLatest() {
    return this.prisma.adminDailySummary.findFirst({ orderBy: { day: 'desc' } });
  }
}
