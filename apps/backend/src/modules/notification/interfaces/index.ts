import { NotificationChannel, NotificationType } from '@prisma/client';

export interface DispatchNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Which channels to attempt. Defaults to ['IN_APP'] when omitted. */
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
}
