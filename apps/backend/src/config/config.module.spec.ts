import { validationSchema } from './config.module';

/**
 * Security review (23 Sep 2026): enableCors() in main.ts always sets credentials: true. Combined
 * with app.corsOrigins' '*' fallback, an operator who forgot to set CORS_ORIGINS in production
 * would silently ship a setup where any website can make authenticated requests against this API.
 * The schema must refuse to boot rather than accept that combination in production.
 */
describe('validationSchema — CORS_ORIGINS', () => {
  const baseEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    PAYMENT_PROVIDER: 'razorpay',
  };

  it('rejects a production config with CORS_ORIGINS unset', () => {
    const { error } = validationSchema.validate(baseEnv, { allowUnknown: true, abortEarly: false });
    expect(error?.message).toMatch(/CORS_ORIGINS is required in production/);
  });

  it('rejects a production config with CORS_ORIGINS explicitly "*"', () => {
    const { error } = validationSchema.validate({ ...baseEnv, CORS_ORIGINS: '*' }, { allowUnknown: true, abortEarly: false });
    expect(error?.message).toMatch(/CORS_ORIGINS must be a real comma-separated origin list/);
  });

  it('rejects a production config with CORS_ORIGINS as an empty string', () => {
    const { error } = validationSchema.validate({ ...baseEnv, CORS_ORIGINS: '' }, { allowUnknown: true, abortEarly: false });
    expect(error).toBeDefined();
  });

  it('accepts a production config with a real origin list', () => {
    const { error } = validationSchema.validate(
      { ...baseEnv, CORS_ORIGINS: 'https://app.viralkar.com,https://merchant.viralkar.com' },
      { allowUnknown: true, abortEarly: false },
    );
    expect(error).toBeUndefined();
  });

  it('allows CORS_ORIGINS to be unset or "*" outside production (developer convenience)', () => {
    const devEnv = { ...baseEnv, NODE_ENV: 'development', PAYMENT_PROVIDER: '' };
    expect(validationSchema.validate(devEnv, { allowUnknown: true, abortEarly: false }).error).toBeUndefined();
    expect(
      validationSchema.validate({ ...devEnv, CORS_ORIGINS: '*' }, { allowUnknown: true, abortEarly: false }).error,
    ).toBeUndefined();
  });
});
