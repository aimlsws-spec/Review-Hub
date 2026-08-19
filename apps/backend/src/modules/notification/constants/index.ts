export const NOTIFICATION_EVENTS = {
  DISPATCHED: 'notification.dispatched',
} as const;

/**
 * Channels notification.dispatch actually knows how to deliver today.
 * PUSH/SMS have no vendor wired up (no FCM/SMS provider configured anywhere
 * in this repo) — adding them later means adding a branch in
 * NotificationService.dispatch(), not changing any caller.
 */
export const SUPPORTED_CHANNELS = ['IN_APP', 'EMAIL'] as const;
