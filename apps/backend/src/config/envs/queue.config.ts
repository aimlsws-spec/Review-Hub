import { registerAs } from '@nestjs/config';

export const queueConfig = registerAs('queue', () => ({
  queues: {
    submissions: 'submissions',
    notifications: 'notifications',
    rewards: 'rewards',
    withdrawals: 'withdrawals',
    emails: 'emails',
    analytics: 'analytics',
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
}));
