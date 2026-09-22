import { LeaderboardRepository } from './leaderboard.repository';

describe('LeaderboardRepository', () => {
  const prisma = {
    reward: { groupBy: jest.fn(), aggregate: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $queryRaw: jest.fn(),
  };
  let repository: LeaderboardRepository;
  const month = { start: new Date('2026-08-31T18:30:00Z'), end: new Date('2026-09-30T18:30:00Z') };

  beforeEach(() => {
    jest.resetAllMocks();
    repository = new LeaderboardRepository(prisma as never);
  });

  describe('what counts towards the ranking', () => {
    it('counts credited cash rewards from people in good standing (an unverified account is one) and not hidden, inside the window', async () => {
      prisma.reward.groupBy.mockResolvedValue([]);

      await repository.topEarners(month, 10);

      const args = prisma.reward.groupBy.mock.calls[0][0];
      expect(args.where).toEqual({
        status: 'CREDITED',
        rewardType: 'CASH',
        deletedAt: null,
        creditedAt: { gte: month.start, lt: month.end },
        user: { hideFromLeaderboard: false, deletedAt: null, status: { notIn: ['SUSPENDED', 'BANNED', 'DEACTIVATED'] } },
      });
      expect(args.take).toBe(10);
    });

    it('has no date window for the all-time board', async () => {
      prisma.reward.groupBy.mockResolvedValue([]);

      await repository.topEarners(null, 10);

      expect(prisma.reward.groupBy.mock.calls[0][0].where).not.toHaveProperty('creditedAt');
    });

    it('orders by total, biggest first, and by id among equals so the order does not change between requests', async () => {
      prisma.reward.groupBy.mockResolvedValue([]);

      await repository.topEarners(month, 10);

      expect(prisma.reward.groupBy.mock.calls[0][0].orderBy).toEqual([{ _sum: { amount: 'desc' } }, { userId: 'asc' }]);
    });

    it('turns the database totals into numbers', async () => {
      prisma.reward.groupBy.mockResolvedValue([{ userId: 'u-1', _sum: { amount: '1234.50' } }]);

      await expect(repository.topEarners(month, 10)).resolves.toEqual([{ userId: 'u-1', totalEarned: 1234.5 }]);
    });

    it('measures one person on exactly the same rules, so a hidden person totals nothing', async () => {
      prisma.reward.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await expect(repository.totalFor('u-1', month)).resolves.toBe(0);

      expect(prisma.reward.aggregate.mock.calls[0][0].where).toMatchObject({ userId: 'u-1', status: 'CREDITED', user: { hideFromLeaderboard: false } });
    });
  });

  it('does not query for profiles when there is nobody to look up', async () => {
    await expect(repository.findProfiles([])).resolves.toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('counts the people ahead in the database, and returns a plain number', async () => {
    prisma.$queryRaw.mockResolvedValue([{ ahead: BigInt(41) }]);

    await expect(repository.countEarningMoreThan(120, month)).resolves.toBe(41);
  });

  it('treats a person who does not exist as not hidden, and can hide and show one', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(repository.isHidden('nope')).resolves.toBe(false);

    await repository.setHidden('u-1', true);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { hideFromLeaderboard: true } });
  });
});
