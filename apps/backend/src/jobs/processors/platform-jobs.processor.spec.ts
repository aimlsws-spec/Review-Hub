import { Job } from 'bullmq';

import { GamificationService } from '../../modules/gamification/services';
import { JobRunRecorder } from '../../modules/scheduled-jobs/services';
import { MerchantSubscriptionService } from '../../modules/subscription/services';
import { PLATFORM_JOBS } from '../platform-jobs.constants';

import { PlatformJobsProcessor } from './platform-jobs.processor';

describe('PlatformJobsProcessor', () => {
  const recorder = { run: jest.fn(async (_definition: unknown, work: () => Promise<unknown>) => ({ status: 'done', result: await work() })) };
  const gamificationService = { awardTopEarners: jest.fn().mockResolvedValue({ month: '2026-09', awarded: 2 }) };
  const subscriptionService = {
    renewDue: jest.fn().mockResolvedValue({ renewed: 1, pastDue: 0, expired: 0 }),
    expireFeaturedCampaigns: jest.fn().mockResolvedValue({ unfeatured: 2 }),
  };
  const processor = new PlatformJobsProcessor(
    recorder as unknown as JobRunRecorder,
    gamificationService as unknown as GamificationService,
    subscriptionService as unknown as MerchantSubscriptionService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('runs the top earner job through the recorder', async () => {
    await processor.process({ name: 'top-earner-badges' } as Job);

    expect(recorder.run).toHaveBeenCalledWith(PLATFORM_JOBS.TOP_EARNER_BADGES, expect.any(Function));
    expect(gamificationService.awardTopEarners).toHaveBeenCalled();
  });

  it('runs subscription renewals and featured expiry', async () => {
    await processor.process({ name: 'subscription-renewals' } as Job);
    await processor.process({ name: 'featured-campaign-expiry' } as Job);

    expect(subscriptionService.renewDue).toHaveBeenCalled();
    expect(subscriptionService.expireFeaturedCampaigns).toHaveBeenCalled();
    expect(recorder.run).toHaveBeenCalledWith(PLATFORM_JOBS.SUBSCRIPTION_RENEWALS, expect.any(Function));
  });

  it('ignores a job it does not know', async () => {
    await processor.process({ name: 'something-else' } as Job);

    expect(recorder.run).not.toHaveBeenCalled();
  });
});
