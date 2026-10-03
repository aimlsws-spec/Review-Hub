import { PrismaService } from '../../../database/prisma/prisma.service';

import { AdminDailySummaryRepository } from './admin-daily-summary.repository';

describe('AdminDailySummaryRepository', () => {
  const prisma = {
    taskSubmission: { count: jest.fn() },
    reward: { aggregate: jest.fn(), groupBy: jest.fn() },
    campaign: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    adminDailySummary: { findUnique: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
  };
  const repository = new AdminDailySummaryRepository(prisma as unknown as PrismaService);
  const start = new Date('2026-10-01T18:30:00Z');
  const end = new Date('2026-10-02T18:30:00Z');

  beforeEach(() => jest.clearAllMocks());

  it('counts approved tasks and credited rewards in the day', async () => {
    prisma.taskSubmission.count.mockResolvedValue(12);
    prisma.reward.aggregate.mockResolvedValue({ _count: { _all: 10 }, _sum: { amount: { toString: () => '500.25' } } });

    await expect(repository.activityBetween(start, end)).resolves.toEqual({ tasksApproved: 12, rewardsCredited: 10, rewardsAmount: 500.25 });
    expect(prisma.taskSubmission.count).toHaveBeenCalledWith({ where: { status: 'APPROVED', reviewedAt: { gte: start, lt: end }, deletedAt: null } });
  });

  it('ranks campaigns by rewards credited and names them', async () => {
    prisma.reward.groupBy.mockResolvedValue([
      { campaignId: 'c-1', _count: { _all: 9 } },
      { campaignId: 'c-gone', _count: { _all: 2 } },
    ]);
    prisma.campaign.findMany.mockResolvedValue([{ id: 'c-1', title: 'Diwali offer' }]);

    await expect(repository.topCampaignsBetween(start, end, 5)).resolves.toEqual([
      { title: 'Diwali offer', completions: 9 },
      { title: 'A campaign', completions: 2 },
    ]);
  });

  it('skips the title lookup when nothing was credited', async () => {
    prisma.reward.groupBy.mockResolvedValue([]);

    await expect(repository.topCampaignsBetween(start, end, 5)).resolves.toEqual([]);
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it('sends to active super admins and admins', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'a-1' }]);

    await expect(repository.findRecipientIds()).resolves.toEqual(['a-1']);
    expect(prisma.user.findMany.mock.calls[0][0].where.userRoles).toEqual({ some: { role: { slug: { in: ['super-admin', 'admin'] } } } });
  });

  it('stores and reads summaries by day', async () => {
    await repository.findByDay('2026-10-02');
    await repository.create('2026-10-02', 'text', { newUsers: 1 });
    await repository.findLatest();

    expect(prisma.adminDailySummary.findUnique).toHaveBeenCalledWith({ where: { day: '2026-10-02' } });
    expect(prisma.adminDailySummary.create).toHaveBeenCalledWith({ data: { day: '2026-10-02', text: 'text', figures: { newUsers: 1 } } });
    expect(prisma.adminDailySummary.findFirst).toHaveBeenCalledWith({ orderBy: { day: 'desc' } });
  });
});
