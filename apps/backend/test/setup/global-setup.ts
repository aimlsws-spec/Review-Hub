import { execSync } from 'child_process';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

import { applyTestEnv, assertSafeTestEnvironment, databaseNameOf } from './safety';

const BACKEND_DIR = path.resolve(__dirname, '../..');

/**
 * Runs once before all e2e files: checks it is safe, brings the test database up to date, seeds the roles and
 * permissions every flow needs, and empties the separate Redis database left over from the last run.
 */
export default async function globalSetup(): Promise<void> {
  applyTestEnv();
  assertSafeTestEnvironment();

  const run = (command: string) => execSync(command, { cwd: BACKEND_DIR, env: process.env, stdio: 'pipe' });

  try {
    run('npx prisma migrate deploy');
  } catch (error) {
    const output = (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(
      `Could not prepare the test database "${databaseNameOf(process.env.DATABASE_URL)}". ` +
        `Is MySQL running and does the database exist? Create it with: npm run e2e:db:create\n${output}`,
    );
  }

  // Idempotent: every row is an upsert, so running it again changes nothing.
  run('npx ts-node --transpile-only prisma/seed.ts');

  // A bank account has to be a day old before it can receive a withdrawal. Most tests create one and use it at once,
  // so the wait is switched off here; the tests about the wait switch it on themselves and switch it off again.
  const prisma = new PrismaClient();
  try {
    // Also forget any maintenance mode or minimum app version an interrupted run left behind: while either is on,
    // every other test would be turned away.
    await prisma.platformConfiguration.updateMany({
      data: { bankCoolingHours: 0, maintenanceMode: false, maintenanceMessage: null, minimumAppVersion: '1.0.0', updateUrl: null },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Safe to empty because assertSafeTestEnvironment() guarantees this is not Redis database 0.
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB as string, 10),
    lazyConnect: true,
  });
  try {
    await redis.connect();
    await redis.flushdb();
  } finally {
    redis.disconnect();
  }
}
