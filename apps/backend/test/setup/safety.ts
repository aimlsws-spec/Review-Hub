/**
 * Guards that make it impossible for an e2e run to touch real data.
 *
 * End-to-end tests create users, move money and delete rows. They must only ever run against a throwaway database
 * and a throwaway Redis database, so every check here refuses to continue rather than warning.
 */

/** The database an e2e run uses on a developer machine when nothing else is given. Matches docker-compose.yml. */
export const DEFAULT_LOCAL_TEST_DATABASE_URL = 'mysql://viral_kar:viral_kar_dev@localhost:3307/viral_kar_test';

/** Credentials for outside services. Blanked during e2e runs so a test can never send a real message or payment. */
export const EXTERNAL_SERVICE_KEYS = [
  'SMTP_USER',
  'SMTP_PASS',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'TWILIO_WHATSAPP_FROM_NUMBER',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'RAZORPAY_X_ACCOUNT_NUMBER',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'APPLE_CLIENT_ID',
] as const;

/** Redis databases 0 is the normal one; e2e runs use their own so they never see or delete real keys. */
export const DEFAULT_TEST_REDIS_DB = '15';

/** The name of the database in a MySQL connection string, or null if the string is not readable. */
export function databaseNameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const name = new URL(url).pathname.replace(/^\//, '');
    return name || null;
  } catch {
    return null;
  }
}

/** Only a database whose name ends in `_test` may be used. */
export function isTestDatabaseUrl(url: string | undefined): boolean {
  const name = databaseNameOf(url);
  return name !== null && name.endsWith('_test');
}

/**
 * Chooses the database for this run. A URL given for testing wins; then the environment's own URL, but only if it
 * is already a test database (as on CI); otherwise the local test database. The normal `DATABASE_URL` from a
 * developer's `.env` is never used, because it points at real development data.
 */
export function chooseTestDatabaseUrl(env: NodeJS.ProcessEnv): string {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (isTestDatabaseUrl(env.DATABASE_URL)) return env.DATABASE_URL as string;
  return DEFAULT_LOCAL_TEST_DATABASE_URL;
}

/** Points the environment at the test database, a separate Redis database and the mock payment gateway. */
export function applyTestEnv(env: NodeJS.ProcessEnv = process.env): void {
  env.NODE_ENV = 'test';
  env.DATABASE_URL = chooseTestDatabaseUrl(env);
  env.REDIS_DB = env.TEST_REDIS_DB ?? DEFAULT_TEST_REDIS_DB;
  // The mock gateway approves every signature, which is exactly right for a test and never right for anything real.
  env.PAYMENT_PROVIDER = 'mock';
  // Nothing in a test may talk to a real AI service; the app falls back to its built-in templates.
  env.AI_SERVICE_URL = 'http://127.0.0.1:1';
  env.AI_SERVICE_TIMEOUT_MS = '500';
  // Uploads go to their own folder, never the real uploads/ directory.
  env.STORAGE_LOCAL_PATH = env.TEST_STORAGE_PATH ?? './uploads-test';
  // Nothing may reach a real outside service. Mail is captured and thrown away; the SMS, push, payment and social
  // login services all do nothing when their credentials are empty.
  env.MAIL_TRANSPORT = 'json';
  for (const key of EXTERNAL_SERVICE_KEYS) env[key] = '';
  env.LOG_FILE_ENABLED = 'false';
  env.LOG_LEVEL = env.LOG_LEVEL ?? 'error';
  env.JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET ?? 'e2e-only-access-secret-at-least-32-characters';
  env.JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET ?? 'e2e-only-refresh-secret-at-least-32-characters';
}

/** Throws unless everything the run is about to touch is safe to change. */
export function assertSafeTestEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const problems: string[] = [];

  if (env.NODE_ENV !== 'test') problems.push(`NODE_ENV is "${env.NODE_ENV}", it must be "test"`);

  if (!isTestDatabaseUrl(env.DATABASE_URL)) {
    problems.push(
      `the database is "${databaseNameOf(env.DATABASE_URL) ?? 'unreadable'}", its name must end in "_test". ` +
        'Create it with: npm run e2e:db:create',
    );
  }

  if (!env.REDIS_DB || env.REDIS_DB === '0') {
    problems.push('REDIS_DB is missing or 0, which is the normal Redis database. Use another number such as 15');
  }

  if (env.PAYMENT_PROVIDER !== 'mock') problems.push(`PAYMENT_PROVIDER is "${env.PAYMENT_PROVIDER}", it must be "mock"`);

  if (env.MAIL_TRANSPORT !== 'json') problems.push('MAIL_TRANSPORT must be "json" so no real email is sent');

  const leaked = EXTERNAL_SERVICE_KEYS.filter((key) => env[key]);
  if (leaked.length > 0) problems.push(`these outside-service credentials are set and must be empty: ${leaked.join(', ')}`);

  if (problems.length > 0) {
    throw new Error(`Refusing to run the e2e tests, because:\n - ${problems.join('\n - ')}`);
  }
}
