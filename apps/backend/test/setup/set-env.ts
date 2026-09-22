import { applyTestEnv, assertSafeTestEnvironment } from './safety';

/**
 * Runs in every e2e test file before anything else loads, so the app is created with the test database and
 * a separate Redis database no matter what the developer's own .env says.
 */
applyTestEnv();
assertSafeTestEnvironment();
