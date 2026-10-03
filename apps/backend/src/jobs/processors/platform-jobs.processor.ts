import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { AdminDailySummaryService } from '../../modules/admin/services';
import { CampaignOptimizerService } from '../../modules/campaign/services';
import { GamificationService } from '../../modules/gamification/services';
import { JobRunRecorder } from '../../modules/scheduled-jobs/services';
import { MerchantSubscriptionService } from '../../modules/subscription/services';
import { QUEUE_NAMES } from '../../queues/queue.constants';
import { AiCallLogService } from '../../shared/ai-call-log';
import { PLATFORM_JOBS, PlatformJobName } from '../platform-jobs.constants';

type Handler = () => Promise<Record<string, unknown>>;

/** Runs the platform's scheduled jobs (PlatformJobsScheduler), each through JobRunRecorder so it is logged and can be paused. */
@Processor(QUEUE_NAMES.PLATFORM_JOBS)
export class PlatformJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(PlatformJobsProcessor.name);

  constructor(
    private readonly recorder: JobRunRecorder,
    private readonly gamificationService: GamificationService,
    private readonly subscriptionService: MerchantSubscriptionService,
    private readonly aiCallLog: AiCallLogService,
    private readonly optimizerService: CampaignOptimizerService,
    private readonly summaryService: AdminDailySummaryService,
  ) {
    super();
  }

  /** What each job does. A full Record, so a job added to PLATFORM_JOBS without a handler does not compile. */
  readonly handlers: Record<PlatformJobName, Handler> = {
    'top-earner-badges': () => this.gamificationService.awardTopEarners(),
    'subscription-renewals': async () => ({ ...(await this.subscriptionService.renewDue()) }),
    'featured-campaign-expiry': () => this.subscriptionService.expireFeaturedCampaigns(),
    'ai-call-log-cleanup': () => this.aiCallLog.cleanup(),
    'campaign-optimizer': () => this.optimizerService.run(),
    'daily-admin-summary': async () => ({ ...(await this.summaryService.buildForYesterday()) }),
  };

  async process(job: Job): Promise<void> {
    const definition = Object.values(PLATFORM_JOBS).find((entry) => entry.jobName === job.name);
    const handler = this.handlers[job.name as PlatformJobName];
    if (!definition || !handler) {
      this.logger.warn(`Ignoring unknown platform job "${job.name}"`);
      return;
    }
    await this.recorder.run(definition, handler);
  }
}
