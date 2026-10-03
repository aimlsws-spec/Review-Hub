import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SubscriptionPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every plan, on or off, with how many merchants are on each now: for the admin page. */
  async findAllWithSubscriberCounts() {
    return this.prisma.subscriptionPlan.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
      include: { _count: { select: { subscriptions: { where: { status: { in: ['ACTIVE', 'PAST_DUE'] } } } } } },
    });
  }

  /** The plans merchants can choose from. */
  async findActive() {
    return this.prisma.subscriptionPlan.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.subscriptionPlan.findFirst({ where: { id, deletedAt: null } });
  }

  async findByCode(code: string) {
    return this.prisma.subscriptionPlan.findFirst({ where: { code } });
  }

  async create(data: Prisma.SubscriptionPlanCreateInput) {
    return this.prisma.subscriptionPlan.create({ data });
  }

  async update(id: string, data: Prisma.SubscriptionPlanUpdateInput) {
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }
}
