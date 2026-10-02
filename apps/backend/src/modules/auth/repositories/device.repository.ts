import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async findByUserId(userId: string) {
    return this.prisma.device.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async findByFingerprint(userId: string, fingerprint: string) {
    return this.prisma.device.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
    });
  }

  async create(data: Prisma.DeviceCreateInput) {
    return this.prisma.device.create({ data });
  }

  async update(id: string, data: Prisma.DeviceUpdateInput) {
    return this.prisma.device.update({ where: { id }, data });
  }

  async updateLastSeen(id: string) {
    return this.prisma.device.update({
      where: { id },
      data: { lastSeenAt: new Date(), updatedAt: new Date() },
    });
  }

  async deactivate(id: string) {
    return this.prisma.device.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  /** Stops push notifications to one device, e.g. when its user signs out on it. */
  async clearPushToken(id: string) {
    return this.prisma.device.update({ where: { id }, data: { pushToken: null } });
  }

  /** Stops push notifications to every device of a user, e.g. "sign out everywhere". */
  async clearPushTokensForUser(userId: string) {
    return this.prisma.device.updateMany({ where: { userId, pushToken: { not: null } }, data: { pushToken: null } });
  }

  /**
   * Removes a token from every device row except `keepDeviceId`. One phone has one token, but it gets a separate
   * device row for each account that signs in on it; without this, the previous account keeps getting pushes there.
   */
  async clearPushTokenElsewhere(pushToken: string, keepDeviceId: string) {
    return this.prisma.device.updateMany({ where: { pushToken, id: { not: keepDeviceId } }, data: { pushToken: null } });
  }

  /** Forgets tokens Firebase reported as no longer valid (app uninstalled, token rotated). */
  async clearPushTokens(pushTokens: string[]) {
    if (pushTokens.length === 0) return { count: 0 };
    return this.prisma.device.updateMany({ where: { pushToken: { in: pushTokens } }, data: { pushToken: null } });
  }

  async deactivateAllByUserId(userId: string, excludeId?: string) {
    const where: Prisma.DeviceWhereInput = { userId, isActive: true };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.device.updateMany({
      where,
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  /** Admin queue: devices at or above a risk threshold, riskiest first. */
  async findHighRisk(params: { minRiskScore: number; page: number; limit: number }) {
    const { minRiskScore, page, limit } = params;
    const where: Prisma.DeviceWhereInput = { riskScore: { gte: minRiskScore } };

    const [data, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { riskScore: 'desc' },
      }),
      this.prisma.device.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async deleteInactiveDevices(olderThan: Date) {
    return this.prisma.device.deleteMany({
      where: {
        isActive: false,
        updatedAt: { lt: olderThan },
      },
    });
  }
}