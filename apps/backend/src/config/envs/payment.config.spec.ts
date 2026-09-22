import { validationSchema } from '../config.module';

import { resolvePaymentProvider } from './payment.config';

describe('resolvePaymentProvider', () => {
  const keys = { RAZORPAY_KEY_ID: 'rzp_test_1', RAZORPAY_KEY_SECRET: 'secret' };

  it('uses the mock in development when no Razorpay keys are configured', () => {
    expect(resolvePaymentProvider({ NODE_ENV: 'development' })).toBe('mock');
  });

  it('uses Razorpay in development once both keys exist', () => {
    expect(resolvePaymentProvider({ NODE_ENV: 'development', ...keys })).toBe('razorpay');
  });

  it('needs both keys, not just one, before leaving the mock', () => {
    expect(resolvePaymentProvider({ NODE_ENV: 'development', RAZORPAY_KEY_ID: 'rzp_test_1' })).toBe('mock');
  });

  it('lets an explicit PAYMENT_PROVIDER override the key-based default outside production', () => {
    expect(resolvePaymentProvider({ NODE_ENV: 'development', ...keys, PAYMENT_PROVIDER: 'mock' })).toBe('mock');
    expect(resolvePaymentProvider({ NODE_ENV: 'staging', PAYMENT_PROVIDER: 'razorpay' })).toBe('razorpay');
  });

  it('never resolves to the mock in production, even with no keys or an explicit mock setting', () => {
    expect(resolvePaymentProvider({ NODE_ENV: 'production' })).toBe('razorpay');
    expect(resolvePaymentProvider({ NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock' })).toBe('razorpay');
  });
});

describe('environment validation of PAYMENT_PROVIDER', () => {
  const base = {
    DATABASE_URL: 'mysql://u:p@localhost:3306/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('refuses to boot in production when PAYMENT_PROVIDER=mock', () => {
    const { error } = validationSchema.validate({ ...base, NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock' });
    expect(error).toBeDefined();
  });

  it('allows the mock outside production', () => {
    const { error } = validationSchema.validate({ ...base, NODE_ENV: 'development', PAYMENT_PROVIDER: 'mock' });
    expect(error).toBeUndefined();
  });

  it('allows production with Razorpay or with no explicit setting', () => {
    expect(validationSchema.validate({ ...base, NODE_ENV: 'production', PAYMENT_PROVIDER: 'razorpay' }).error).toBeUndefined();
    expect(validationSchema.validate({ ...base, NODE_ENV: 'production' }).error).toBeUndefined();
  });

  it('treats a blank value, as copied from .env.example, as unset', () => {
    expect(validationSchema.validate({ ...base, NODE_ENV: 'development', PAYMENT_PROVIDER: '' }).error).toBeUndefined();
    expect(validationSchema.validate({ ...base, NODE_ENV: 'production', PAYMENT_PROVIDER: '' }).error).toBeUndefined();
    expect(resolvePaymentProvider({ NODE_ENV: 'development', PAYMENT_PROVIDER: '' })).toBe('mock');
  });

  it('rejects an unknown provider name', () => {
    const { error } = validationSchema.validate({ ...base, NODE_ENV: 'development', PAYMENT_PROVIDER: 'stripe' });
    expect(error).toBeDefined();
  });
});
