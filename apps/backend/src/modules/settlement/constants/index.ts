export const INVOICE_NUMBER_PREFIX = 'INV';

/** Runs once daily at 2am server time — well after any late-night campaign/reward activity settles. */
export const SETTLEMENT_CRON_PATTERN = '0 2 * * *';
export const SETTLEMENT_JOB_NAME = 'generate-daily';
/** Fixed id so BullMQ treats re-registering this repeatable job on every app boot as a no-op, not a duplicate. */
export const SETTLEMENT_REPEAT_JOB_ID = 'daily-settlement';
