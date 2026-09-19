export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REWARDS: 'rewards',
  EMAILS: 'emails',
  SETTLEMENT: 'settlement',
  AI_VERIFICATION: 'ai-verification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
