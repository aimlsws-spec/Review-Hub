import { Job } from 'bullmq';

import { AdminDailySummaryService } from '../../modules/admin/services';
import { CampaignOptimizerService, CampaignScheduleService } from '../../modules/campaign/services';
import { GamificationService } from '../../modules/gamification/services';
import { JobRunRecorder } from '../../modules/scheduled-jobs/services';
import { MerchantSubscriptionService } from '../../modules/subscription/services';
import { AiCallLogService } from '../../shared/ai-call-log';
import { PLATFORM_JOBS } from '../platform-jobs.constants';

import { PlatformJobsProcessor } from './platform-jobs.processor';

describe('PlatformJobsProcessor', () => {
  const recorder = { run: jest.fn(async (_definition: unknown, work: () => Promise<unknown>) => ({ status: 'done', result: await work() })) };
  const gamificationService = { awardTopEarners: jest.fn().mockResolvedValue({ month: '2026-09', awarded: 2 }) };
  const subscriptionService = {
    renewDue: jest.fn().mockResolvedValue({ renewed: 1, pastDue: 0, expired: 0 }),
    expireFeaturedCampaigns: jest.fn().mockResolvedValue({ unfeatured: 2 }),
  };
  const aiCallLog = { cleanup: jest.fn().mockResolvedValue({ deleted: 5 }) };
  const optimizerService = { run: jest.fn().mockResolvedValue({ merchants: 3, newSuggestions: 2, notified: 1, failed: 0 }) };
  const campaignScheduleService = { run: jest.fn().mockResolvedValue({ started: 1, expired: 2, failed: 0 }) };
  const summaryService = { buildForYesterday: jest.fn().mockResolvedValue({ day: '2026-10-02', created: true, recipients: 2 }) };
  const processor = new PlatformJobsProcessor(
    recorder as unknown as JobRunRecorder,
    gamificationService as unknown as GamificationService,
    subscriptionService as unknown as MerchantSubscriptionService,
    aiCallLog as unknown as AiCallLogService,
    optimizerService as unknown as CampaignOptimizerService,
    summaryService as unknown as AdminDailySummaryService,
    campaignScheduleService as unknown as CampaignScheduleService,
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

  it('cleans up old AI call logs', async () => {
    await processor.process({ name: 'ai-call-log-cleanup' } as Job);

    expect(aiCallLog.cleanup).toHaveBeenCalled();
  });

  it('runs the campaign optimizer', async () => {
    await processor.process({ name: 'campaign-optimizer' } as Job);

    expect(optimizerService.run).toHaveBeenCalled();
  });

  it('builds the daily admin summary', async () => {
    await processor.process({ name: 'daily-admin-summary' } as Job);

    expect(summaryService.buildForYesterday).toHaveBeenCalled();
  });

  it('starts and expires campaigns on their dates', async () => {
    await processor.process({ name: 'campaign-schedule' } as Job);

    expect(recorder.run).toHaveBeenCalledWith(PLATFORM_JOBS.CAMPAIGN_SCHEDULE, expect.any(Function));
    expect(campaignScheduleService.run).toHaveBeenCalled();
  });

  it('has a handler for every platform job', () => {
    for (const job of Object.values(PLATFORM_JOBS)) {
      expect(processor.handlers[job.jobName]).toBeInstanceOf(Function);
    }
  });

  it('ignores a job it does not know', async () => {
    await processor.process({ name: 'something-else' } as Job);

    expect(recorder.run).not.toHaveBeenCalled();
  });
});
