import { NotificationQueueService } from '../../notification/services';
import { MerchantSuggestionRepository } from '../repositories/merchant-suggestion.repository';

import { CampaignOptimizerService } from './campaign-optimizer.service';
import { MerchantInsightsService } from './merchant-insights.service';

describe('CampaignOptimizerService', () => {
  const insights = { getInsights: jest.fn() };
  const repository = { findMerchantsWithActiveCampaigns: jest.fn(), existsSince: jest.fn(), create: jest.fn(), findOpen: jest.fn(), dismiss: jest.fn() };
  const notificationQueue = { enqueue: jest.fn() };
  const service = new CampaignOptimizerService(
    insights as unknown as MerchantInsightsService,
    repository as unknown as MerchantSuggestionRepository,
    notificationQueue as unknown as NotificationQueueService,
  );
  const now = new Date('2026-10-03T00:30:00Z');
  const suggestion = (code: string, campaignId?: string) => ({ code, severity: 'WARNING', title: `Title ${code}`, detail: 'Detail', campaignId });

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockImplementation(async (s) => ({ id: `s-${s.code}`, ...s }));
  });

  it('stores only suggestions not made in the last 7 days, and notifies the owner once', async () => {
    repository.findMerchantsWithActiveCampaigns.mockResolvedValue([{ id: 'm-1', userId: 'owner-1' }]);
    insights.getInsights.mockResolvedValue({ suggestions: [suggestion('LOW_COMPLETION', 'c-1'), suggestion('RAISE_BUDGET')] });
    repository.existsSince.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await service.run(now);

    expect(repository.existsSince).toHaveBeenNthCalledWith(1, 'm-1', 'LOW_COMPLETION', 'c-1', new Date('2026-09-26T00:30:00Z'));
    expect(repository.existsSince).toHaveBeenNthCalledWith(2, 'm-1', 'RAISE_BUDGET', null, expect.any(Date));
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(notificationQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1', type: 'CAMPAIGN', title: 'A new suggestion for your campaigns', message: 'Title RAISE_BUDGET' }),
    );
    expect(result).toEqual({ merchants: 1, newSuggestions: 1, notified: 1, failed: 0 });
  });

  it('tells nobody when there is nothing new', async () => {
    repository.findMerchantsWithActiveCampaigns.mockResolvedValue([{ id: 'm-1', userId: 'owner-1' }]);
    insights.getInsights.mockResolvedValue({ suggestions: [suggestion('LOW_COMPLETION', 'c-1')] });
    repository.existsSince.mockResolvedValue(true);

    await expect(service.run(now)).resolves.toEqual({ merchants: 1, newSuggestions: 0, notified: 0, failed: 0 });
    expect(notificationQueue.enqueue).not.toHaveBeenCalled();
  });

  it('carries on past a merchant that fails', async () => {
    repository.findMerchantsWithActiveCampaigns.mockResolvedValue([
      { id: 'm-bad', userId: 'o-1' },
      { id: 'm-2', userId: 'o-2' },
    ]);
    insights.getInsights.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ suggestions: [suggestion('A'), suggestion('B')] });
    repository.existsSince.mockResolvedValue(false);

    const result = await service.run(now);

    expect(result).toEqual({ merchants: 2, newSuggestions: 2, notified: 1, failed: 1 });
    expect(notificationQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ title: '2 new suggestions for your campaigns' }));
  });

  it('lists open suggestions and dismisses one, refusing someone else’s', async () => {
    repository.findOpen.mockResolvedValue([{ id: 's-1' }]);
    repository.dismiss.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(service.listOpen('m-1')).resolves.toEqual([{ id: 's-1' }]);
    expect(repository.findOpen).toHaveBeenCalledWith('m-1', 20);
    await expect(service.dismiss('m-1', 's-1')).resolves.toEqual({ dismissed: true });
    await expect(service.dismiss('m-1', 's-other')).rejects.toThrow('Suggestion');
  });
});
