import { Logger, Module } from '@nestjs/common';

import { RazorpayWebhookController } from './controllers';
import { RazorpayService } from './services';

/** A pure leaf module — provides the Razorpay gateway client only, so Merchant/Wallet can both import it without a cycle. */
@Module({
  controllers: [RazorpayWebhookController],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class PaymentModule {
  private readonly logger = new Logger(PaymentModule.name);

  constructor() {
    this.logger.log('PaymentModule initialized');
  }
}
