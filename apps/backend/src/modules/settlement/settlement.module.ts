import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';

import { AdminSettlementController, InvoiceController, SettlementController } from './controllers';
import { InvoiceRepository, SettlementRepository } from './repositories';
import { InvoicePdfService, InvoiceService, SettlementSchedulerService, SettlementService } from './services';

@Module({
  imports: [AuthModule, MerchantModule],
  controllers: [SettlementController, InvoiceController, AdminSettlementController],
  providers: [
    SettlementService,
    InvoiceService,
    InvoicePdfService,
    SettlementSchedulerService,
    SettlementRepository,
    InvoiceRepository,
  ],
  exports: [SettlementService, InvoiceService],
})
export class SettlementModule {
  private readonly logger = new Logger(SettlementModule.name);

  constructor() {
    this.logger.log('SettlementModule initialized');
  }
}
