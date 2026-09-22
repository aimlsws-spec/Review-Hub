import { NotificationChannel, NotificationType } from '@prisma/client';

export interface DispatchNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Which channels to attempt. Defaults to ['IN_APP'] when omitted. */
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
  /** Set when this message is one recipient's copy of an admin broadcast, so delivery can be counted per broadcast. */
  broadcastId?: string;
}

export * from './broadcast.interface';
