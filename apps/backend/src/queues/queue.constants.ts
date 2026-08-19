export const QUEUE_NAMES = {
  SUBMISSIONS: 'submissions',
  NOTIFICATIONS: 'notifications',
  REWARDS: 'rewards',
  WITHDRAWALS: 'withdrawals',
  EMAILS: 'emails',
  ANALYTICS: 'analytics',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
