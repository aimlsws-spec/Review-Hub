export const NOTIFICATION_EVENTS = {
  DISPATCHED: 'notification.dispatched',
} as const;

/**
 * Channels notification.dispatch actually knows how to deliver today.
 * PUSH is delivered via Firebase Cloud Messaging (PushService) when Firebase
 * credentials are configured — see apps/backend/.env's FIREBASE_* vars —
 * and silently disabled otherwise. SMS has no vendor wired up (no provider
 * configured anywhere in this repo) — adding it means adding a branch in
 * NotificationService.dispatch(), not changing any caller.
 */
export const SUPPORTED_CHANNELS = ['IN_APP', 'EMAIL', 'PUSH'] as const;
