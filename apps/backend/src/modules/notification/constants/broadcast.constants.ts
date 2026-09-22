/** Job names on the notifications queue. Plain 'dispatch' jobs (one user each) keep their existing name. */
export const BROADCAST_JOB_NAMES = {
  /** Expands one broadcast into a 'dispatch' job per recipient. */
  FAN_OUT: 'broadcast-fan-out',
  /** Repeats every minute and starts any broadcast whose scheduled time has arrived. */
  TICK: 'broadcast-tick',
} as const;

/** Fixed id so registering the repeatable tick on every app boot is a no-op, not a duplicate. */
export const BROADCAST_TICK_JOB_ID = 'broadcast-tick';
export const BROADCAST_TICK_INTERVAL_MS = 60_000;

/** Recipients queued per database page; small enough to keep memory flat, large enough to be quick. */
export const BROADCAST_PAGE_SIZE = 500;

/** How many due broadcasts one tick starts, so a backlog is worked off over a few ticks, not all at once. */
export const BROADCAST_DUE_BATCH = 20;

/** What an admin may label a broadcast as. Transactional types (REWARD, WITHDRAWAL, SECURITY...) are reserved for the system. */
export const BROADCAST_TYPES = ['PROMOTIONAL', 'SYSTEM', 'CAMPAIGN'] as const;

export const BROADCAST_LIMITS = {
  TITLE_MAX: 100,
  MESSAGE_MAX: 500,
  /** Scheduling closer than this to now is treated as a mistake; use "send now" instead. */
  MIN_LEAD_MS: 60_000,
  MAX_LEAD_DAYS: 90,
} as const;

/** Placeholders an admin may use in a title or message. Anything else would reach users as literal "{{text}}". */
export const MESSAGE_VARIABLES = ['firstName'] as const;

/**
 * Smart timing: each person's message is held until the hour they are usually active, within the next 24 hours.
 * Hours are on Indian time. The platform serves India, and a stored per-user timezone is "UTC" for almost
 * everyone because nothing asks for it, so it cannot be trusted.
 */
export const SMART_TIMING = {
  UTC_OFFSET_MINUTES: 330,
  /** How far back activity is looked at. */
  LOOKBACK_DAYS: 60,
  /** Fewer actions than this is too little to call a habit; the default hour is used instead. */
  MIN_ACTIVITIES: 5,
  /** Early evening, when people are most likely to be free. Used for people with too little history. */
  DEFAULT_HOUR: 19,
  /** A message is never sent between 10 PM and 9 AM, whatever the history says. */
  EARLIEST_HOUR: 9,
  LATEST_HOUR: 21,
} as const;

/** Important announcements are sent straight away; holding one back for hours would defeat its purpose. */
export const SMART_TIMING_EXCLUDED_TYPES: readonly string[] = ['SYSTEM'];

/** Broadcasts go to app users, not to merchants' or admins' accounts. */
export const BROADCAST_AUDIENCE_ROLE_SLUG = 'user';
