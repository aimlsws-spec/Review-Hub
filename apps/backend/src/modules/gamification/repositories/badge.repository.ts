import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class BadgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; isActive?: boolean }) {
    const { page, limit, isActive } = params;
    const where: Prisma.BadgeWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.badge.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { criteriaValue: 'asc' } }),
      this.prisma.badge.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.badge.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: Prisma.BadgeCreateInput) {
    return this.prisma.badge.create({ data });
  }

  async update(id: string, data: Prisma.BadgeUpdateInput) {
    return this.prisma.badge.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.badge.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Active badges this user hasn't already earned — the candidate set to evaluate after an activity update. */
  async findActiveUnearnedForUser(userId: string) {
    return this.prisma.badge.findMany({
      where: { deletedAt: null, isActive: true, userBadges: { none: { userId } } },
    });
  }

  async findEarnedByUser(userId: string) {
    return this.prisma.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { earnedAt: 'desc' } });
  }

  /** The @@unique([userId, badgeId]) constraint makes this idempotent if called twice for the same badge. */
  async award(userId: string, badgeId: string) {
    return this.prisma.userBadge.create({ data: { user: { connect: { id: userId } }, badge: { connect: { id: badgeId } } } });
  }
}
