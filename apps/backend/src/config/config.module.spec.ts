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
    // Required in production since column encryption was added (2 Oct 2026); irrelevant to what these tests check.
    FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    FIELD_HASH_KEY: Buffer.alloc(32, 2).toString('base64'),
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

describe('validationSchema — column encryption keys', () => {
  const key = (fill: number) => Buffer.alloc(32, fill).toString('base64');
  const production = {
    NODE_ENV: 'production',
    DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    PAYMENT_PROVIDER: 'razorpay',
    CORS_ORIGINS: 'https://app.viralkar.com',
  };
  const validate = (env: Record<string, string>) => validationSchema.validate(env, { allowUnknown: true, abortEarly: false }).error;

  it('refuses to boot production without both keys', () => {
    expect(validate(production)?.message).toMatch(/FIELD_ENCRYPTION_KEY/);
    expect(validate({ ...production, FIELD_ENCRYPTION_KEY: key(1) })?.message).toMatch(/FIELD_HASH_KEY/);
  });

  it('refuses a key that is not 32 bytes of base64', () => {
    expect(validate({ ...production, FIELD_ENCRYPTION_KEY: 'short', FIELD_HASH_KEY: key(2) })).toBeDefined();
  });

  it('refuses the same key for encryption and hashing', () => {
    expect(validate({ ...production, FIELD_ENCRYPTION_KEY: key(1), FIELD_HASH_KEY: key(1) })?.message).toMatch(/must differ/);
  });

  it('accepts two different keys', () => {
    expect(validate({ ...production, FIELD_ENCRYPTION_KEY: key(1), FIELD_HASH_KEY: key(2) })).toBeUndefined();
  });

  it('lets development run without keys (the built-in development keys are used)', () => {
    expect(validate({ ...production, NODE_ENV: 'development', CORS_ORIGINS: '' })).toBeUndefined();
  });
});
