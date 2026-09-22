/* eslint-disable no-console */
/**
 * Creates the throwaway database that the e2e tests use, inside the MySQL container from docker-compose.yml.
 * Safe to run again. Cross-platform, which is why it is a script and not a shell one-liner.
 *
 *   npm run e2e:db:create
 */
const { spawnSync } = require('child_process');
const path = require('path');

const composeFile = path.resolve(__dirname, '../../../../docker-compose.yml');
const sql = [
  'CREATE DATABASE IF NOT EXISTS viral_kar_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
  "GRANT ALL PRIVILEGES ON viral_kar_test.* TO 'viral_kar'@'%';",
  'FLUSH PRIVILEGES;',
].join('\n');

const result = spawnSync(
  'docker',
  ['compose', '-f', composeFile, 'exec', '-T', 'mysql', 'mysql', '-uroot', '-pviral_kar_root_dev'],
  { input: sql, encoding: 'utf8' },
);

if (result.status !== 0) {
  console.error(result.stderr || result.error);
  console.error('\nCould not create the test database. Is the MySQL container running? Try: docker compose up -d mysql');
  process.exit(1);
}
console.log('Test database viral_kar_test is ready.');
