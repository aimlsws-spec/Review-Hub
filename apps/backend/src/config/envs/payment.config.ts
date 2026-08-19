import { registerAs } from '@nestjs/config';

export const paymentConfig = registerAs('payment', () => ({
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  razorpayXAccountNumber: process.env.RAZORPAY_X_ACCOUNT_NUMBER ?? '',
}));
