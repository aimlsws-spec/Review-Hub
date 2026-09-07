import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class UserAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.userAnalytics.findUnique({ where: { userId } });
  }

  async upsertForUser(
    userId: string,
    data: Prisma.UserAnalyticsUpdateInput & Omit<Prisma.UserAnalyticsCreateInput, 'user'>,
  ) {
    return this.prisma.userAnalytics.upsert({
      where: { userId },
      create: { ...data, user: { connect: { id: userId } } },
      update: data,
    });
  }
}
