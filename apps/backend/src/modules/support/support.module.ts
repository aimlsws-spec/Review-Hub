import { Logger, Module } from '@nestjs/common';

import { MerchantModule } from '../merchant/merchant.module';

import { MerchantSupportController, SupportController } from './controllers';
import { SupportMessageRepository, SupportTicketRepository } from './repositories';
import { SupportService } from './services';

@Module({
  imports: [MerchantModule],
  controllers: [SupportController, MerchantSupportController],
  providers: [SupportService, SupportTicketRepository, SupportMessageRepository],
  exports: [SupportService],
})
export class SupportModule {
  private readonly logger = new Logger(SupportModule.name);

  constructor() {
    this.logger.log('SupportModule initialized');
  }
}
