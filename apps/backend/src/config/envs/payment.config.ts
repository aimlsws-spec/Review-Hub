import { registerAs } from '@nestjs/config';

export type PaymentProviderMode = 'mock' | 'razorpay';

/**
 * Decides which payment gateway implementation the app uses.
 *
 * Production never falls back to the mock: a mock that "verifies" every signature
 * would let anyone forge a payment webhook. Outside production, an explicit
 * PAYMENT_PROVIDER wins; otherwise Razorpay is used only when keys exist, so a
 * machine with no credentials still runs on the mock.
 */
export function resolvePaymentProvider(env: NodeJS.ProcessEnv = process.env): PaymentProviderMode {
  if (env.NODE_ENV === 'production') return 'razorpay';
  if (env.PAYMENT_PROVIDER === 'mock' || env.PAYMENT_PROVIDER === 'razorpay') return env.PAYMENT_PROVIDER;
  return env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? 'razorpay' : 'mock';
}

export const paymentConfig = registerAs('payment', () => ({
  provider: resolvePaymentProvider(),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  razorpayXAccountNumber: process.env.RAZORPAY_X_ACCOUNT_NUMBER ?? '',
}));
