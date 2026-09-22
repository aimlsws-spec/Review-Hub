/* eslint-disable no-console */
/**
 * Wipes and rebuilds the e2e test database from the migrations. It only ever touches a database whose name ends in
 * "_test", and refuses otherwise, so it can not be pointed at development data by mistake.
 *
 *   npm run e2e:db:reset
 */
require('ts-node').register({ transpileOnly: true });
const { execSync } = require('child_process');
const path = require('path');

const { applyTestEnv, assertSafeTestEnvironment, databaseNameOf } = require('./safety');

applyTestEnv();
assertSafeTestEnvironment();

console.log(`Resetting the test database "${databaseNameOf(process.env.DATABASE_URL)}"...`);
execSync('npx prisma migrate reset --force --skip-seed', {
  cwd: path.resolve(__dirname, '../..'),
  env: process.env,
  stdio: 'inherit',
});
