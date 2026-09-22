import { PrismaService } from '../src/database/prisma/prisma.service';

import {
  applyTestEnv,
  assertSafeTestEnvironment,
  chooseTestDatabaseUrl,
  DEFAULT_LOCAL_TEST_DATABASE_URL,
  databaseNameOf,
  isTestDatabaseUrl,
} from './setup/safety';
import { createTestApp } from './utils/create-test-app';

const DEV_URL = 'mysql://viral_kar:viral_kar_dev@localhost:3307/viral_kar';
const TEST_URL = 'mysql://viral_kar:viral_kar_dev@localhost:3307/viral_kar_test';

describe('E2E safety', () => {
  describe('picking the database', () => {
    it('reads the database name from a connection string', () => {
      expect(databaseNameOf(TEST_URL)).toBe('viral_kar_test');
      expect(databaseNameOf('mysql://u:p@host:3306/db?connection_limit=5')).toBe('db');
      expect(databaseNameOf('not a url')).toBeNull();
      expect(databaseNameOf(undefined)).toBeNull();
      expect(databaseNameOf('mysql://u:p@host:3306')).toBeNull();
    });

    it('only accepts a database whose name ends in _test', () => {
      expect(isTestDatabaseUrl(TEST_URL)).toBe(true);
      expect(isTestDatabaseUrl(DEV_URL)).toBe(false);
      expect(isTestDatabaseUrl('mysql://u:p@h/test_data')).toBe(false);
      expect(isTestDatabaseUrl('mysql://u:p@h/viral_kar_testing')).toBe(false);
      expect(isTestDatabaseUrl(undefined)).toBe(false);
    });

    it('never uses the development DATABASE_URL, even if that is all that is set', () => {
      expect(chooseTestDatabaseUrl({ DATABASE_URL: DEV_URL })).toBe(DEFAULT_LOCAL_TEST_DATABASE_URL);
      expect(chooseTestDatabaseUrl({})).toBe(DEFAULT_LOCAL_TEST_DATABASE_URL);
    });

    it('uses an environment database that is already a test one (as on CI), and an explicit test URL over that', () => {
      expect(chooseTestDatabaseUrl({ DATABASE_URL: 'mysql://ci:ci@127.0.0.1:3306/viral_kar_test' })).toBe('mysql://ci:ci@127.0.0.1:3306/viral_kar_test');
      expect(chooseTestDatabaseUrl({ DATABASE_URL: TEST_URL, TEST_DATABASE_URL: 'mysql://x:y@h/other_test' })).toBe('mysql://x:y@h/other_test');
    });
  });

  describe('applyTestEnv', () => {
    it('points a developer machine at the test database, a separate Redis database and the mock gateway', () => {
      const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', DATABASE_URL: DEV_URL, REDIS_DB: '0', PAYMENT_PROVIDER: 'razorpay' };

      applyTestEnv(env);

      expect(env.NODE_ENV).toBe('test');
      expect(env.DATABASE_URL).toBe(DEFAULT_LOCAL_TEST_DATABASE_URL);
      expect(env.REDIS_DB).toBe('15');
      expect(env.PAYMENT_PROVIDER).toBe('mock');
      expect(() => assertSafeTestEnvironment(env)).not.toThrow();
    });

    it('blanks every outside-service credential and captures mail instead of sending it', () => {
      const env: NodeJS.ProcessEnv = { SMTP_PASS: 'real', TWILIO_AUTH_TOKEN: 'real', FIREBASE_PRIVATE_KEY: 'real', RAZORPAY_KEY_SECRET: 'real', MAIL_TRANSPORT: 'smtp' };

      applyTestEnv(env);

      expect(env.MAIL_TRANSPORT).toBe('json');
      for (const key of ['SMTP_PASS', 'TWILIO_AUTH_TOKEN', 'FIREBASE_PRIVATE_KEY', 'RAZORPAY_KEY_SECRET']) expect(env[key]).toBe('');
      expect(() => assertSafeTestEnvironment(env)).not.toThrow();
    });

    it('sends uploads to their own folder and keeps the AI service out of it', () => {
      const env: NodeJS.ProcessEnv = { STORAGE_LOCAL_PATH: './uploads', AI_SERVICE_URL: 'http://localhost:8000' };

      applyTestEnv(env);

      expect(env.STORAGE_LOCAL_PATH).toBe('./uploads-test');
      expect(env.AI_SERVICE_URL).toBe('http://127.0.0.1:1');
    });
  });

  describe('assertSafeTestEnvironment', () => {
    const safe = (): NodeJS.ProcessEnv => ({ NODE_ENV: 'test', DATABASE_URL: TEST_URL, REDIS_DB: '15', PAYMENT_PROVIDER: 'mock', MAIL_TRANSPORT: 'json' });

    it('accepts a safe environment', () => {
      expect(() => assertSafeTestEnvironment(safe())).not.toThrow();
    });

    it.each([
      ['a development database', { DATABASE_URL: DEV_URL }, /must end in "_test"/],
      ['no database at all', { DATABASE_URL: undefined }, /unreadable/],
      ['the normal Redis database', { REDIS_DB: '0' }, /REDIS_DB/],
      ['no Redis database chosen', { REDIS_DB: undefined }, /REDIS_DB/],
      ['the real payment gateway', { PAYMENT_PROVIDER: 'razorpay' }, /must be "mock"/],
      ['production mode', { NODE_ENV: 'production' }, /must be "test"/],
      ['real email being sent', { MAIL_TRANSPORT: 'smtp' }, /MAIL_TRANSPORT/],
      ['a Twilio account that could send real SMS', { TWILIO_ACCOUNT_SID: 'AC123' }, /TWILIO_ACCOUNT_SID/],
      ['live Razorpay keys', { RAZORPAY_KEY_ID: 'rzp_live_x', RAZORPAY_KEY_SECRET: 'y' }, /RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET/],
    ])('refuses %s', (_label, override, message) => {
      expect(() => assertSafeTestEnvironment({ ...safe(), ...override })).toThrow(message);
    });

    it('lists every problem at once', () => {
      expect(() => assertSafeTestEnvironment({ NODE_ENV: 'development', DATABASE_URL: DEV_URL, REDIS_DB: '0', PAYMENT_PROVIDER: 'razorpay' })).toThrow(
        /NODE_ENV[\s\S]*_test[\s\S]*REDIS_DB[\s\S]*mock/,
      );
    });
  });

  describe('the running app', () => {
    it('is connected to the test database and not to development data', async () => {
      const app = await createTestApp();
      try {
        const prisma = app.get(PrismaService);
        const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT DATABASE() AS name`;

        expect(name).toMatch(/_test$/);
        expect(name).not.toBe('viral_kar');
      } finally {
        await app.close();
      }
    });

    it('refuses to create an app when pointed at a real database', async () => {
      const saved = process.env.DATABASE_URL;
      process.env.DATABASE_URL = DEV_URL;
      try {
        await expect(createTestApp()).rejects.toThrow(/Refusing to run the e2e tests/);
      } finally {
        process.env.DATABASE_URL = saved;
      }
    });
  });
});
