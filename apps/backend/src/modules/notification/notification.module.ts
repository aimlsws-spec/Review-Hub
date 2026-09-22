import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';

import { AdminBroadcastController, AdminNotificationTemplateController, NotificationController } from './controllers';
import { NotificationListener } from './listeners';
import {
  BroadcastAudienceRepository,
  NotificationBroadcastRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  UserActivityRepository,
} from './repositories';
import {
  BroadcastFanOutService,
  BroadcastSchedulerService,
  BroadcastService,
  NotificationQueueService,
  NotificationService,
  NotificationTemplateService,
  PushService,
  SendTimeService,
} from './services';

@Module({
  imports: [AuthModule, MerchantModule],
  controllers: [NotificationController, AdminBroadcastController, AdminNotificationTemplateController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationRepository,
    NotificationPreferenceRepository,
    NotificationListener,
    PushService,
    BroadcastService,
    BroadcastFanOutService,
    BroadcastSchedulerService,
    SendTimeService,
    NotificationTemplateService,
    BroadcastAudienceRepository,
    NotificationBroadcastRepository,
    NotificationTemplateRepository,
    UserActivityRepository,
  ],
  exports: [NotificationService, NotificationQueueService, NotificationRepository, BroadcastFanOutService],
})
export class NotificationModule {
  private readonly logger = new Logger(NotificationModule.name);

  constructor() {
    this.logger.log('NotificationModule initialized');
  }
}
