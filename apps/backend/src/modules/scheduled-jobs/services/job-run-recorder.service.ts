import { Injectable, Logger } from '@nestjs/common';
import { JobType, Prisma } from '@prisma/client';

import { describeError } from '@common/utils';

import { JobExecutionLogRepository, ScheduledJobRepository } from '../repositories';

/** A job the platform runs on a schedule, as it appears on the admin Scheduled Jobs page. */
export interface RecordedJobDefinition {
  jobName: string;
  jobType: JobType;
  cronExpression: string;
}

export type JobRunOutcome = { status: 'skipped' } | { status: 'done'; result: Record<string, unknown> };

/**
 * Runs a scheduled job through its row on the Scheduled Jobs page: the row is created the first time the job runs,
 * an admin can switch the job off there (it is then skipped), and every run is logged with its duration, its result
 * or its error. The error is re-thrown, so BullMQ's retries still apply.
 */
@Injectable()
export class JobRunRecorder {
  private readonly logger = new Logger(JobRunRecorder.name);

  constructor(
    private readonly jobRepository: ScheduledJobRepository,
    private readonly logRepository: JobExecutionLogRepository,
  ) {}

  async run(definition: RecordedJobDefinition, work: () => Promise<Record<string, unknown>>): Promise<JobRunOutcome> {
    const job =
      (await this.jobRepository.findByName(definition.jobName)) ??
      (await this.jobRepository.create({ ...definition, enabled: true }));

    if (!job.enabled) {
      this.logger.log(`Skipping ${definition.jobName}: switched off on the Scheduled Jobs page`);
      return { status: 'skipped' };
    }

    const startedAt = new Date();
    try {
      const result = await work();
      const completedAt = new Date();
      await this.logRepository.create({
        job: { connect: { id: job.id } },
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        success: true,
        logs: result as Prisma.InputJsonValue,
      });
      await this.jobRepository.update(job.id, { lastRun: startedAt, retries: 0 });
      return { status: 'done', result };
    } catch (error) {
      const completedAt = new Date();
      await this.logRepository.create({
        job: { connect: { id: job.id } },
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        success: false,
        errorMessage: describeError(error),
      });
      await this.jobRepository.update(job.id, { lastRun: startedAt, retries: { increment: 1 } });
      throw error;
    }
  }
}
