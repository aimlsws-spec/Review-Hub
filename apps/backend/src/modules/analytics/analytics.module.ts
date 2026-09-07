import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { AnalyticsController } from './controllers';
import {
  AnalyticsEventRepository,
  DailyAnalyticsRepository,
  MerchantAnalyticsRepository,
  UserAnalyticsRepository,
} from './repositories';
import { AnalyticsService } from './services';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsEventRepository,
    DailyAnalyticsRepository,
    MerchantAnalyticsRepository,
    UserAnalyticsRepository,
  ],
  exports: [
    AnalyticsEventRepository,
    DailyAnalyticsRepository,
    MerchantAnalyticsRepository,
    UserAnalyticsRepository,
  ],
})
export class AnalyticsModule {
  private readonly logger = new Logger(AnalyticsModule.name);

  constructor() {
    this.logger.log('AnalyticsModule initialized');
  }
}
