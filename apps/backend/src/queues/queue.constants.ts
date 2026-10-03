export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REWARDS: 'rewards',
  EMAILS: 'emails',
  SETTLEMENT: 'settlement',
  AI_VERIFICATION: 'ai-verification',
  WALLET_AUTO_RECHARGE: 'wallet-auto-recharge',
  /** The platform's own scheduled jobs (see jobs/platform-jobs.constants.ts). */
  PLATFORM_JOBS: 'platform-jobs',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
