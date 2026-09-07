import { Logger, Module } from '@nestjs/common';

import { MerchantModule } from '../merchant/merchant.module';

import { WebhookController } from './controllers';
import { WebhookDeliveryRepository, WebhookRepository } from './repositories';
import { WebhookService } from './services';

@Module({
  imports: [MerchantModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookRepository, WebhookDeliveryRepository],
  exports: [WebhookDeliveryRepository],
})
export class WebhookModule {
  private readonly logger = new Logger(WebhookModule.name);

  constructor() {
    this.logger.log('WebhookModule initialized');
  }
}
