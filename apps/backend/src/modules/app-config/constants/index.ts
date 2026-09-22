/** The header the mobile app sends on every request so the server knows which build is talking to it. */
export const APP_VERSION_HEADER = 'x-app-version';

export const APP_CONFIG_CONSTANTS = {
  /**
   * How long the settings are remembered. The guard runs on every request, so it must not read the database each
   * time; a change an admin makes takes effect within this many milliseconds.
   */
  CACHE_TTL_MS: 5000,
  DEFAULT_MAINTENANCE_MESSAGE: 'We are making improvements and will be back shortly. Thank you for your patience.',
  DEFAULT_MINIMUM_VERSION: '1.0.0',
} as const;

/**
 * What stays open during maintenance:
 * - health checks, so monitoring and the load balancer can tell the server is up;
 * - the app's own settings, which is how the app learns about the maintenance in the first place;
 * - sign-in, refresh and sign-out, so an administrator can get in to switch maintenance off;
 * - payment callbacks and the AI worker, which are server-to-server and must not be dropped half-way through a payment.
 */
export const MAINTENANCE_EXEMPT_PATH = /^\/api\/v\d+\/(health|app-config|auth\/(login|refresh|logout)|payments\/webhooks|internal\/ai)(\/|$)/;

/** Only the app's own settings and health are exempt from the version check: an old app must still be able to be told to update. */
export const VERSION_EXEMPT_PATH = /^\/api\/v\d+\/(health|app-config)(\/|$)/;
