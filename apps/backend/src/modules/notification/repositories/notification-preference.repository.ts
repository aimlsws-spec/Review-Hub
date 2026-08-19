import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.notificationPreference.findUnique({ where: { userId } });
  }

  async getOrCreate(userId: string) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return this.prisma.notificationPreference.create({ data: { user: { connect: { id: userId } } } });
  }

  async update(userId: string, data: Prisma.NotificationPreferenceUpdateInput) {
    return this.prisma.notificationPreference.update({ where: { userId }, data });
  }
}
