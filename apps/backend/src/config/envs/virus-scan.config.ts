import { registerAs } from '@nestjs/config';

/**
 * Virus scanning of user uploads through a ClamAV daemon (clamd), which is free and open source. Off unless
 * VIRUS_SCAN_ENABLED=true, so a developer machine without ClamAV works as before; the boot log says so.
 */
export const virusScanConfig = registerAs('virusScan', () => ({
  enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
  host: process.env.CLAMAV_HOST ?? '127.0.0.1',
  port: parseInt(process.env.CLAMAV_PORT ?? '3310', 10),
  timeoutMs: parseInt(process.env.CLAMAV_TIMEOUT_MS ?? '15000', 10),
  // Fail closed by default: while scanning is switched on, a file that could not be scanned is not stored.
  failOpen: process.env.VIRUS_SCAN_FAIL_OPEN === 'true',
}));
