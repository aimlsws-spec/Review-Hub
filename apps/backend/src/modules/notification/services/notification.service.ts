import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';
import { escapeHtml } from '@common/utils';

import { EmailQueueService } from '../../../mail/email-queue.service';
import { DeviceRepository } from '../../auth/repositories/device.repository';
import { UserRepository } from '../../auth/repositories/user.repository';
import { NotificationQueryDto, UpdatePreferencesDto } from '../dto';
import { DispatchNotificationPayload } from '../interfaces';
import { NotificationPreferenceRepository, NotificationRepository } from '../repositories';

import { PushService } from './push.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly preferenceRepository: NotificationPreferenceRepository,
    private readonly userRepository: UserRepository,
    private readonly emailQueueService: EmailQueueService,
    private readonly deviceRepository: DeviceRepository,
    private readonly pushService: PushService,
  ) {}

  /**
   * The one place that turns "something happened" into an actual delivered
   * notification. Called from NotificationProcessor, not directly from
   * event listeners, so every dispatch goes through the `notifications`
   * queue and gets BullMQ's retry semantics.
   */
  async dispatch(payload: DispatchNotificationPayload) {
    const channels = payload.channels ?? ['IN_APP'];
    const preference = await this.preferenceRepository.getOrCreate(payload.userId);
    const created = [];

    // Fields every channel's copy of the message shares.
    const record = {
      user: { connect: { id: payload.userId } },
      title: payload.title,
      message: payload.message,
      type: payload.type,
      data: payload.data as never,
      ...(payload.broadcastId ? { broadcast: { connect: { id: payload.broadcastId } } } : {}),
    };

    if (channels.includes('IN_APP') && preference.inAppEnabled) {
      created.push(
        await this.notificationRepository.create({ ...record, channel: 'IN_APP', status: 'SENT', sentAt: new Date() }),
      );
    }

    if (channels.includes('EMAIL') && preference.emailEnabled) {
      const user = await this.userRepository.findByIdSimple(payload.userId);
      if (user?.email) {
        const notification = await this.notificationRepository.create({ ...record, channel: 'EMAIL', status: 'QUEUED' });

        await this.emailQueueService.enqueue({
          to: user.email,
          subject: payload.title,
          // Escaped because the text can carry a user's own name or an admin-typed message, and this is HTML.
          html: `<p>${escapeHtml(payload.message)}</p>`,
          notificationId: notification.id,
        });

        created.push(notification);
      }
    }

    if (channels.includes('PUSH') && preference.pushEnabled) {
      const devices = await this.deviceRepository.findByUserId(payload.userId);
      const tokens = devices.map((d) => d.pushToken).filter((t): t is string => !!t);

      if (tokens.length > 0) {
        const notification = await this.notificationRepository.create({ ...record, channel: 'PUSH', status: 'SENT', sentAt: new Date() });

        const deadTokens = await this.pushService.sendToTokens(tokens, {
          title: payload.title,
          body: payload.message,
          // `type` rides along in `data` (not just the stored row) so the client can
          // deep-link a tap without a round-trip — e.g. REWARD -> wallet screen.
          // The id lets the app report the tap (see recordEngagement), for open and click rates.
          data: stringifyPushData({ ...payload.data, type: payload.type, notificationId: notification.id }),
        });
        // Uninstalled apps and replaced tokens are forgotten, so later notifications stop trying them.
        if (deadTokens.length > 0) await this.deviceRepository.clearPushTokens(deadTokens);

        created.push(notification);
      }
    }

    return created;
  }

  async listMine(userId: string, query: NotificationQueryDto) {
    return this.notificationRepository.findByUser({
      userId,
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.countUnread(userId);
    return { count };
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification');
    }
    return this.notificationRepository.markRead(notificationId);
  }

  /** The app reporting that the person opened, or clicked through, one of their notifications. */
  async recordEngagement(notificationId: string, userId: string, action: 'OPENED' | 'CLICKED') {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification');
    }
    await this.notificationRepository.recordEngagement(notificationId, action);
    return { recorded: true };
  }

  async markAllRead(userId: string) {
    const result = await this.notificationRepository.markAllRead(userId);
    return { updated: result.count };
  }

  async getPreferences(userId: string) {
    return this.preferenceRepository.getOrCreate(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    await this.preferenceRepository.getOrCreate(userId);
    return this.preferenceRepository.update(userId, dto);
  }
}

/** FCM's data payload requires every value to be a string. */
function stringifyPushData(data: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]));
}
