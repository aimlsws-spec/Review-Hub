import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';

import { PAYMENT_PROVIDER } from './interfaces';
import { createPaymentProvider, PaymentModule } from './payment.module';
import { MockPaymentService, RazorpayService } from './services';

describe('createPaymentProvider', () => {
  const razorpay = { name: 'razorpay' } as unknown as RazorpayService;
  const mock = { name: 'mock' } as unknown as MockPaymentService;

  it('returns the mock gateway in mock mode', () => {
    expect(createPaymentProvider('mock', razorpay, mock)).toBe(mock);
  });

  it('returns the Razorpay gateway in razorpay mode', () => {
    expect(createPaymentProvider('razorpay', razorpay, mock)).toBe(razorpay);
  });
});

describe('PaymentModule wiring', () => {
  // Real Nest dependency injection, no database needed: PaymentModule only depends on config and events.
  const compileWith = (provider: string) =>
    Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ payment: { provider } })] }),
        EventEmitterModule.forRoot(),
        PaymentModule,
      ],
    }).compile();

  it('injects the mock gateway under PAYMENT_PROVIDER when configured for mock', async () => {
    const module = await compileWith('mock');
    expect(module.get(PAYMENT_PROVIDER)).toBeInstanceOf(MockPaymentService);
  });

  it('injects the Razorpay gateway under PAYMENT_PROVIDER when configured for razorpay', async () => {
    const module = await compileWith('razorpay');
    expect(module.get(PAYMENT_PROVIDER)).toBeInstanceOf(RazorpayService);
  });
});
