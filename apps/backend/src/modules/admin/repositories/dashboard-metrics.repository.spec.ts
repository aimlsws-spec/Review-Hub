import { PrismaService } from '../../../database/prisma/prisma.service';

import { DashboardMetricsRepository } from './dashboard-metrics.repository';

describe('DashboardMetricsRepository', () => {
  const prisma = { $queryRaw: jest.fn(), campaign: { count: jest.fn() } };
  const repository = new DashboardMetricsRepository(prisma as unknown as PrismaService);
  const start = new Date('2026-09-26T18:30:00Z');
  const end = new Date('2026-10-03T18:30:00Z');

  beforeEach(() => jest.clearAllMocks());

  it('turns MySQL dates, counts and decimals into plain days and numbers', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { day: new Date('2026-10-02T00:00:00Z'), value: BigInt(7) },
      { day: '2026-10-03', value: { toString: () => '12.50' } },
      { day: new Date('2026-10-01T00:00:00Z'), value: null },
    ]);

    await expect(repository.newUsersByDay(start, end)).resolves.toEqual([
      { day: '2026-10-02', value: 7 },
      { day: '2026-10-03', value: 12.5 },
      { day: '2026-10-01', value: 0 },
    ]);
  });

  it('binds the range as parameters and groups by India day', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await repository.withdrawalsPaidByDay(start, end);

    const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
    expect(strings.join('?')).toContain('INTERVAL 330 MINUTE');
    expect(strings.join('?')).toContain("status = 'PAID'");
    expect(values).toEqual([start, end]);
  });

  it.each([
    'commissionByDay',
    'newUsersByDay',
    'campaignsCreatedByDay',
    'withdrawalsRequestedByDay',
    'withdrawalsPaidByDay',
    'fraudFlagsByDay',
  ] as const)('%s runs one grouped query', async (method) => {
    prisma.$queryRaw.mockResolvedValue([]);

    await repository[method](start, end);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('counts the campaigns running now', async () => {
    prisma.campaign.count.mockResolvedValue(3);

    await expect(repository.countActiveCampaigns()).resolves.toBe(3);
    expect(prisma.campaign.count).toHaveBeenCalledWith({ where: { status: 'ACTIVE', deletedAt: null } });
  });
});
