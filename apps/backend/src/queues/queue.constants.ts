export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REWARDS: 'rewards',
  EMAILS: 'emails',
  SETTLEMENT: 'settlement',
  AI_VERIFICATION: 'ai-verification',
  WALLET_AUTO_RECHARGE: 'wallet-auto-recharge',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
