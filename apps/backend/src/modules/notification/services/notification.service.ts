import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

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

    if (channels.includes('IN_APP') && preference.inAppEnabled) {
      created.push(
        await this.notificationRepository.create({
          user: { connect: { id: payload.userId } },
          title: payload.title,
          message: payload.message,
          type: payload.type,
          channel: 'IN_APP',
          status: 'SENT',
          sentAt: new Date(),
          data: payload.data as never,
        }),
      );
    }

    if (channels.includes('EMAIL') && preference.emailEnabled) {
      const user = await this.userRepository.findByIdSimple(payload.userId);
      if (user?.email) {
        const notification = await this.notificationRepository.create({
          user: { connect: { id: payload.userId } },
          title: payload.title,
          message: payload.message,
          type: payload.type,
          channel: 'EMAIL',
          status: 'QUEUED',
          data: payload.data as never,
        });

        await this.emailQueueService.enqueue({
          to: user.email,
          subject: payload.title,
          html: `<p>${payload.message}</p>`,
          notificationId: notification.id,
        });

        created.push(notification);
      }
    }

    if (channels.includes('PUSH') && preference.pushEnabled) {
      const devices = await this.deviceRepository.findByUserId(payload.userId);
      const tokens = devices.map((d) => d.pushToken).filter((t): t is string => !!t);

      if (tokens.length > 0) {
        const notification = await this.notificationRepository.create({
          user: { connect: { id: payload.userId } },
          title: payload.title,
          message: payload.message,
          type: payload.type,
          channel: 'PUSH',
          status: 'SENT',
          sentAt: new Date(),
          data: payload.data as never,
        });

        await this.pushService.sendToTokens(tokens, {
          title: payload.title,
          body: payload.message,
          // `type` rides along in `data` (not just the stored row) so the client can
          // deep-link a tap without a round-trip — e.g. REWARD -> wallet screen.
          data: stringifyPushData({ ...payload.data, type: payload.type }),
        });

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
