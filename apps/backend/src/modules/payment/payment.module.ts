import { Logger, Module } from '@nestjs/common';


import { RazorpayWebhookController } from './controllers';
import { PAYMENT_PROVIDER } from './interfaces';
import { MockPaymentService, RazorpayService } from './services';

/** 
 * Uses the PAYMENT_PROVIDER token to swap between Razorpay and Mock implementation.
 * Currently defaults to MockPaymentService since Razorpay credentials are not yet available.
 */
@Module({
  controllers: [RazorpayWebhookController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useClass: MockPaymentService, // Easily swappable to RazorpayService via process.env.USE_RAZORPAY
    },
    RazorpayService, // Still providing it just in case needed by some other things explicitly
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {
  private readonly logger = new Logger(PaymentModule.name);

  constructor() {
    this.logger.log('PaymentModule initialized (using MockPaymentService)');
  }
}
