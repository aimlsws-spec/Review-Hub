import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ReportController } from './controllers';
import { ReportRepository, ReportScheduleRepository } from './repositories';
import { ReportService } from './services';

@Module({
  imports: [AuthModule],
  controllers: [ReportController],
  providers: [ReportService, ReportRepository, ReportScheduleRepository],
  exports: [ReportRepository, ReportScheduleRepository],
})
export class ReportsModule {
  private readonly logger = new Logger(ReportsModule.name);

  constructor() {
    this.logger.log('ReportsModule initialized');
  }
}
