import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ScheduledJobController } from './controllers';
import { JobExecutionLogRepository, ScheduledJobRepository } from './repositories';
import { ScheduledJobService } from './services';

@Module({
  imports: [AuthModule],
  controllers: [ScheduledJobController],
  providers: [ScheduledJobService, ScheduledJobRepository, JobExecutionLogRepository],
  exports: [ScheduledJobRepository, JobExecutionLogRepository],
})
export class ScheduledJobsModule {
  private readonly logger = new Logger(ScheduledJobsModule.name);

  constructor() {
    this.logger.log('ScheduledJobsModule initialized');
  }
}
