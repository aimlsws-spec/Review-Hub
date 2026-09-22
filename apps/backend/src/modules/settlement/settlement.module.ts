import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';

import { AdminInvoiceController, AdminSettlementController, InvoiceController, SettlementController } from './controllers';
import { InvoiceNoteRepository, InvoiceRepository, SettlementRepository } from './repositories';
import { InvoiceNoteService, InvoicePdfService, InvoiceService, SettlementSchedulerService, SettlementService } from './services';

@Module({
  imports: [AuthModule, MerchantModule],
  controllers: [SettlementController, InvoiceController, AdminSettlementController, AdminInvoiceController],
  providers: [
    SettlementService,
    InvoiceService,
    InvoiceNoteService,
    InvoicePdfService,
    SettlementSchedulerService,
    SettlementRepository,
    InvoiceRepository,
    InvoiceNoteRepository,
  ],
  exports: [SettlementService, InvoiceService],
})
export class SettlementModule {
  private readonly logger = new Logger(SettlementModule.name);

  constructor() {
    this.logger.log('SettlementModule initialized');
  }
}
