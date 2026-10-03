import { Queue } from 'bullmq';

import { PLATFORM_JOBS } from './platform-jobs.constants';
import { PlatformJobsScheduler } from './platform-jobs.scheduler';

describe('PlatformJobsScheduler', () => {
  it('registers every platform job as a repeatable job in India time, with a stable id', async () => {
    const queue = { add: jest.fn() };

    await new PlatformJobsScheduler(queue as unknown as Queue).onModuleInit();

    const jobs = Object.values(PLATFORM_JOBS);
    expect(queue.add).toHaveBeenCalledTimes(jobs.length);
    for (const job of jobs) {
      expect(queue.add).toHaveBeenCalledWith(job.jobName, {}, {
        repeat: { pattern: job.cronExpression, tz: 'Asia/Kolkata' },
        jobId: `repeat:${job.jobName}`,
      });
    }
  });
});
