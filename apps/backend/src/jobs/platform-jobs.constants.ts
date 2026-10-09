import type { RecordedJobDefinition } from '../modules/scheduled-jobs/services/job-run-recorder.service';

/** Cron patterns below are read in India time. */
export const PLATFORM_JOB_TIMEZONE = 'Asia/Kolkata';

/**
 * The platform's own scheduled jobs, run on the platform-jobs queue (PlatformJobsProcessor) and shown on the admin
 * Scheduled Jobs page, where each can be switched off. Changing a cron here takes effect on the next deploy; editing
 * it on the page does not reschedule it.
 */
export const PLATFORM_JOBS = {
  /** Top earners of the month just ended get the Top Earner badge. 00:30 on the 1st. */
  TOP_EARNER_BADGES: { jobName: 'top-earner-badges', jobType: 'CUSTOM', cronExpression: '30 0 1 * *' },
  /** AI call logs older than the retention period are deleted. 03:00 daily. */
  AI_CALL_LOG_CLEANUP: { jobName: 'ai-call-log-cleanup', jobType: 'CLEANUP', cronExpression: '0 3 * * *' },
  /** Campaign suggestions for merchants with active campaigns. 06:00 daily. */
  CAMPAIGN_OPTIMIZER: { jobName: 'campaign-optimizer', jobType: 'ANALYTICS_AGGREGATION', cronExpression: '0 6 * * *' },
  /** Merchant subscriptions whose month has ended are renewed (or expire). 01:00 daily. */
  SUBSCRIPTION_RENEWALS: { jobName: 'subscription-renewals', jobType: 'CUSTOM', cronExpression: '0 1 * * *' },
  /** Featured campaigns whose paid days are over go back among the rest. Five past every hour. */
  FEATURED_CAMPAIGN_EXPIRY: { jobName: 'featured-campaign-expiry', jobType: 'CAMPAIGN_EXPIRY', cronExpression: '5 * * * *' },
  /** Scheduled campaigns start when their start time comes; campaigns past their end date expire. Every 5 minutes. */
  CAMPAIGN_SCHEDULE: { jobName: 'campaign-schedule', jobType: 'CAMPAIGN_EXPIRY', cronExpression: '*/5 * * * *' },
  /** Yesterday's summary, emailed to super and platform admins. 08:00 daily. */
  DAILY_ADMIN_SUMMARY: { jobName: 'daily-admin-summary', jobType: 'REPORT_GENERATION', cronExpression: '0 8 * * *' },
} as const satisfies Record<string, RecordedJobDefinition>;

export type PlatformJobName = (typeof PLATFORM_JOBS)[keyof typeof PLATFORM_JOBS]['jobName'];
