import { AiCallLogRepository } from './ai-call-log.repository';
import { AiCallLogService, estimateTokens, percentile95 } from './ai-call-log.service';

describe('AiCallLogService', () => {
  const repository = {
    create: jest.fn(),
    findPricedProvider: jest.fn(),
    byDay: jest.fn(),
    byFeature: jest.fn(),
    latencies: jest.fn(),
    deleteOlderThan: jest.fn(),
  };
  const service = new AiCallLogService(repository as unknown as AiCallLogRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findPricedProvider.mockResolvedValue(null);
  });

  describe('record', () => {
    it('stores sizes, never the text itself', async () => {
      await service.record({ feature: 'TEXT_SUGGESTION', status: 'SUCCESS', latencyMs: 812.4, input: 'x'.repeat(40), output: 'y'.repeat(8), userId: 'u-1' });

      const data = repository.create.mock.calls[0][0];
      expect(data).toEqual(
        expect.objectContaining({ feature: 'TEXT_SUGGESTION', responseStatus: 'SUCCESS', latency: 812, inputTokens: 10, outputTokens: 2, tokens: 12, cost: 0, userId: 'u-1' }),
      );
      expect(JSON.stringify(data)).not.toContain('xxxx');
      expect(data).not.toHaveProperty('provider');
    });

    it('prices the call when the provider has prices, and links it', async () => {
      repository.findPricedProvider.mockResolvedValue({ id: 'p-1', inputPer1k: 0.5, outputPer1k: 1.5 });

      await service.record({ feature: 'CAPTIONS', status: 'SUCCESS', latencyMs: 10, input: 'x'.repeat(4000), output: 'y'.repeat(2000) });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ cost: 1.25, provider: { connect: { id: 'p-1' } } }));
    });

    it('never fails the call it describes', async () => {
      repository.create.mockRejectedValue(new Error('database down'));

      await expect(service.record({ feature: 'KYC_OCR', status: 'FAILED', latencyMs: 5 })).resolves.toBeUndefined();
    });
  });

  describe('monitoring', () => {
    it('fills every day, and works out rates and the 95th-percentile latency per feature', async () => {
      repository.byDay.mockResolvedValue([{ day: '2026-10-03', calls: 10, failed: 1, fallback: 2, tokens: 500, cost: 0.123 }]);
      repository.byFeature.mockResolvedValue([{ feature: 'CAPTIONS', calls: 20, failed: 2, fallback: 5, tokens: 900, cost: 0.4567 }]);
      repository.latencies.mockResolvedValue(Array.from({ length: 100 }, (_, i) => i + 1));

      const result = await service.monitoring(7, new Date('2026-10-03T10:00:00Z'));

      expect(result.days).toHaveLength(7);
      expect(result.days[6]).toEqual({ day: '2026-10-03', calls: 10, failed: 1, fallback: 2, tokens: 500, cost: 0.123 });
      expect(result.days[0]).toEqual({ day: '2026-09-27', calls: 0, failed: 0, fallback: 0, tokens: 0, cost: 0 });
      expect(result.features[0]).toEqual(expect.objectContaining({ feature: 'CAPTIONS', errorRate: 10, fallbackRate: 25, p95LatencyMs: 95, cost: 0.46 }));
      expect(result.totals).toEqual(expect.objectContaining({ calls: 10, errorRate: 10, fallbackRate: 20, cost: 0.12 }));
    });
  });

  it('deletes logs older than 90 days', async () => {
    repository.deleteOlderThan.mockResolvedValue(42);

    await expect(service.cleanup(new Date('2026-10-03T00:00:00Z'))).resolves.toEqual({ deleted: 42 });
    expect(repository.deleteOlderThan).toHaveBeenCalledWith(new Date('2026-07-05T00:00:00Z'));
  });

  it('estimates tokens and the 95th percentile', () => {
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens('abcdefgh')).toBe(2);
    expect(estimateTokens({ a: 1 })).toBe(2);
    expect(percentile95([])).toBe(0);
    expect(percentile95([5, 1, 3])).toBe(5);
  });
});
