import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PaymentProviderMode } from '../../config/envs/payment.config';

import { RazorpayWebhookController } from './controllers';
import { PaymentSimulationGuard } from './guards';
import { PAYMENT_PROVIDER, PaymentProvider } from './interfaces';
import { MockPaymentService, RazorpayService } from './services';

/**
 * Picks the gateway implementation from `payment.provider` (see resolvePaymentProvider).
 * Exported separately so the selection rule can be unit tested without booting Nest.
 */
export function createPaymentProvider(
  mode: PaymentProviderMode,
  razorpay: RazorpayService,
  mock: MockPaymentService,
): PaymentProvider {
  return mode === 'mock' ? mock : razorpay;
}

/**
 * A leaf module — it only provides the gateway, so Merchant and Wallet can both
 * import it without creating a cycle. Which gateway is decided by config, not code.
 */
@Module({
  controllers: [RazorpayWebhookController],
  providers: [
    RazorpayService,
    MockPaymentService,
    PaymentSimulationGuard,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, RazorpayService, MockPaymentService],
      useFactory: (config: ConfigService, razorpay: RazorpayService, mock: MockPaymentService) =>
        createPaymentProvider(config.get<PaymentProviderMode>('payment.provider', 'razorpay'), razorpay, mock),
    },
  ],
  exports: [PAYMENT_PROVIDER, PaymentSimulationGuard],
})
export class PaymentModule {
  private readonly logger = new Logger(PaymentModule.name);

  constructor(config: ConfigService) {
    const mode = config.get<PaymentProviderMode>('payment.provider', 'razorpay');
    if (mode === 'mock') {
      this.logger.warn('PaymentModule is using the MOCK gateway: no real money moves and webhook signatures are not checked.');
    } else {
      this.logger.log('PaymentModule initialized (Razorpay)');
    }
  }
}
