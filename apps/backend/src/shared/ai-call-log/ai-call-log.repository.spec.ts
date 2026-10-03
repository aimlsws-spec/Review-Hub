import { PrismaService } from '../../database/prisma/prisma.service';

import { AiCallLogRepository } from './ai-call-log.repository';

describe('AiCallLogRepository', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    aIUsageLog: { create: jest.fn(), groupBy: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    aIProvider: { findFirst: jest.fn() },
  };
  const repository = new AiCallLogRepository(prisma as unknown as PrismaService);
  const start = new Date('2026-09-26T18:30:00Z');
  const end = new Date('2026-10-03T18:30:00Z');

  beforeEach(() => jest.clearAllMocks());

  it('reads prices only when both are set on the provider', async () => {
    prisma.aIProvider.findFirst
      .mockResolvedValueOnce({ id: 'p-1', configuration: { inputPricePer1kTokens: 0.5, outputPricePer1kTokens: '1.5' } })
      .mockResolvedValueOnce({ id: 'p-1', configuration: { inputPricePer1kTokens: 0.5 } })
      .mockResolvedValueOnce(null);

    await expect(repository.findPricedProvider()).resolves.toEqual({ id: 'p-1', inputPer1k: 0.5, outputPer1k: 1.5 });
    await expect(repository.findPricedProvider()).resolves.toBeNull();
    await expect(repository.findPricedProvider()).resolves.toBeNull();
  });

  it('groups calls per India day in SQL, binding the range', async () => {
    prisma.$queryRaw.mockResolvedValue([{ day: new Date('2026-10-03T00:00:00Z'), calls: BigInt(4), failed: '1', fallback: null, tokens: BigInt(300), cost: { toString: () => '0.25' } }]);

    await expect(repository.byDay(start, end)).resolves.toEqual([{ day: '2026-10-03', calls: 4, failed: 1, fallback: 0, tokens: 300, cost: 0.25 }]);
    const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
    expect(strings.join('?')).toContain('INTERVAL 330 MINUTE');
    expect(values).toEqual([start, end]);
  });

  it('adds up outcomes per feature', async () => {
    prisma.aIUsageLog.groupBy.mockResolvedValue([
      { feature: 'CAPTIONS', responseStatus: 'SUCCESS', _count: { _all: 6 }, _sum: { tokens: 600, cost: 0.1 } },
      { feature: 'CAPTIONS', responseStatus: 'FALLBACK', _count: { _all: 3 }, _sum: { tokens: 90, cost: null } },
      { feature: 'CAPTIONS', responseStatus: 'TIMEOUT', _count: { _all: 1 }, _sum: { tokens: 10, cost: 0 } },
    ]);

    await expect(repository.byFeature(start, end)).resolves.toEqual([{ feature: 'CAPTIONS', calls: 10, failed: 1, fallback: 3, tokens: 700, cost: 0.1 }]);
  });

  it('samples recent latencies and deletes old logs', async () => {
    prisma.aIUsageLog.findMany.mockResolvedValue([{ latency: 120 }, { latency: 80 }]);
    prisma.aIUsageLog.deleteMany.mockResolvedValue({ count: 3 });
    const cutoff = new Date('2026-07-05T00:00:00Z');

    await expect(repository.latencies('CAPTIONS', start, end)).resolves.toEqual([120, 80]);
    await expect(repository.deleteOlderThan(cutoff)).resolves.toBe(3);
    expect(prisma.aIUsageLog.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  });
});
