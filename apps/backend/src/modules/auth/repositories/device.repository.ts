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

  async deactivateAllByUserId(userId: string, excludeId?: string) {
    const where: Prisma.DeviceWhereInput = { userId, isActive: true };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.device.updateMany({
      where,
      data: { isActive: false, updatedAt: new Date() },
    });
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