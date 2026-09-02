import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';

import { NotificationController } from './controllers';
import { NotificationListener } from './listeners';
import { NotificationPreferenceRepository, NotificationRepository } from './repositories';
import { NotificationQueueService, NotificationService, PushService } from './services';

@Module({
  imports: [AuthModule, MerchantModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationRepository,
    NotificationPreferenceRepository,
    NotificationListener,
    PushService,
  ],
  exports: [NotificationService, NotificationQueueService, NotificationRepository],
})
export class NotificationModule {
  private readonly logger = new Logger(NotificationModule.name);

  constructor() {
    this.logger.log('NotificationModule initialized');
  }
}
