import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { CampaignRepository } from '../repositories';

import { CampaignScheduleService } from './campaign-schedule.service';
import { CampaignService } from './campaign.service';

describe('CampaignScheduleService', () => {
  const repository = { findPastEnd: jest.fn(), findDueToStart: jest.fn() };
  const campaigns = { expire: jest.fn(), startScheduled: jest.fn() };
  const service = new CampaignScheduleService(
    repository as unknown as CampaignRepository,
    campaigns as unknown as CampaignService,
  );
  const now = new Date('2026-10-08T10:00:00.000Z');

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findPastEnd.mockResolvedValue([]);
    repository.findDueToStart.mockResolvedValue([]);
  });

  it('expires campaigns past their end date and starts scheduled ones whose time has come', async () => {
    repository.findPastEnd.mockResolvedValue([{ id: 'ended-1' }, { id: 'ended-2' }]);
    repository.findDueToStart.mockResolvedValue([{ id: 'due-1' }]);

    await expect(service.run(now)).resolves.toEqual({ started: 1, expired: 2, failed: 0 });
    expect(repository.findPastEnd).toHaveBeenCalledWith(now, expect.any(Number));
    expect(repository.findDueToStart).toHaveBeenCalledWith(now, expect.any(Number));
    expect(campaigns.expire.mock.calls).toEqual([['ended-1'], ['ended-2']]);
    expect(campaigns.startScheduled).toHaveBeenCalledWith('due-1');
  });

  it('expires before it starts, so a campaign whose start and end both passed while it waited is never started', async () => {
    const order: string[] = [];
    repository.findPastEnd.mockImplementation(async () => {
      order.push('find ended');
      return [];
    });
    repository.findDueToStart.mockImplementation(async () => {
      order.push('find due');
      return [];
    });

    await service.run(now);

    expect(order).toEqual(['find ended', 'find due']);
  });

  it('carries on past a campaign it could not move, and counts it as failed', async () => {
    repository.findPastEnd.mockResolvedValue([{ id: 'already-moved' }, { id: 'ended' }]);
    campaigns.expire.mockRejectedValueOnce(new BadRequestException('Cannot move a campaign from EXPIRED to EXPIRED'));

    await expect(service.run(now)).resolves.toEqual({ started: 0, expired: 1, failed: 1 });
    expect(campaigns.expire).toHaveBeenCalledWith('ended');
  });
});
