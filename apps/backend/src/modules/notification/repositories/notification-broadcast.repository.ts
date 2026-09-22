import { Injectable } from '@nestjs/common';
import { BroadcastStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

const WITH_CREATOR = { createdBy: { select: { id: true, firstName: true, lastName: true } } } satisfies Prisma.NotificationBroadcastInclude;

export type BroadcastWithCreator = Prisma.NotificationBroadcastGetPayload<{ include: typeof WITH_CREATOR }>;

@Injectable()
export class NotificationBroadcastRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.NotificationBroadcastUncheckedCreateInput): Promise<BroadcastWithCreator> {
    return this.prisma.notificationBroadcast.create({ data, include: WITH_CREATOR });
  }

  async findById(id: string): Promise<BroadcastWithCreator | null> {
    return this.prisma.notificationBroadcast.findFirst({ where: { id, deletedAt: null }, include: WITH_CREATOR });
  }

  async list(params: { status?: BroadcastStatus; skip: number; take: number }) {
    const where: Prisma.NotificationBroadcastWhereInput = { deletedAt: null, ...(params.status ? { status: params.status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.notificationBroadcast.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: WITH_CREATOR,
      }),
      this.prisma.notificationBroadcast.count({ where }),
    ]);
    return { data, total };
  }

  /** Ids of broadcasts whose time has come and that nobody has started yet, oldest first. */
  async findDueIds(now: Date, limit: number): Promise<string[]> {
    const due = await this.prisma.notificationBroadcast.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now }, deletedAt: null },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    return due.map((row) => row.id);
  }

  /**
   * Takes a broadcast to start sending it. The status flip is one UPDATE, so if the same broadcast is
   * picked up twice only one caller wins. An already-SENDING broadcast is returned as-is so an
   * interrupted send can resume; anything else (cancelled, finished) returns null.
   */
  async claimForSending(id: string): Promise<BroadcastWithCreator | null> {
    const { count } = await this.prisma.notificationBroadcast.updateMany({
      where: { id, status: 'SCHEDULED', deletedAt: null },
      data: { status: 'SENDING', startedAt: new Date() },
    });

    const broadcast = await this.findById(id);
    if (count === 1) return broadcast;
    return broadcast?.status === 'SENDING' ? broadcast : null;
  }

  async saveProgress(id: string, cursorUserId: string, recipientCount: number) {
    await this.prisma.notificationBroadcast.update({ where: { id }, data: { cursorUserId, recipientCount } });
  }

  async markSent(id: string) {
    await this.prisma.notificationBroadcast.update({ where: { id }, data: { status: 'SENT', completedAt: new Date() } });
  }

  async markFailed(id: string, reason: string) {
    await this.prisma.notificationBroadcast.updateMany({
      where: { id, status: 'SENDING' },
      data: { status: 'FAILED', completedAt: new Date(), failureReason: reason.slice(0, 1000) },
    });
  }

  /** Cancels only a broadcast that has not started. Returns false if it already had, so nothing half-sent is disturbed. */
  async cancelIfScheduled(id: string): Promise<boolean> {
    const { count } = await this.prisma.notificationBroadcast.updateMany({
      where: { id, status: 'SCHEDULED', deletedAt: null },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    return count === 1;
  }

  /** How many messages this broadcast produced, split by channel and delivery status. */
  async deliveryBreakdown(broadcastId: string) {
    const groups = await this.prisma.notification.groupBy({
      by: ['channel', 'status'],
      where: { broadcastId },
      _count: { _all: true },
    });
    return groups.map((group) => ({ channel: group.channel, status: group.status, count: group._count._all }));
  }
}
