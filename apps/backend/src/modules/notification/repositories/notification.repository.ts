import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({ data });
  }

  async findById(id: string) {
    return this.prisma.notification.findFirst({ where: { id, deletedAt: null } });
  }

  async update(id: string, data: Prisma.NotificationUpdateInput) {
    return this.prisma.notification.update({ where: { id }, data });
  }

  async findByUser(params: { userId: string; page: number; limit: number; unreadOnly?: boolean }) {
    const { userId, page, limit, unreadOnly } = params;
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null };
    if (unreadOnly) where.readAt = null;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null, deletedAt: null } });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date(), status: 'READ' } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });
  }
}
