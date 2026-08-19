import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class LoginHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    isSuccess: boolean;
    failureReason?: string;
  }) {
    return this.prisma.loginHistory.create({
      data: {
        userId: data.userId,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        browser: data.userAgent,
        isSuccess: data.isSuccess,
        failureReason: data.failureReason,
      },
    });
  }

  async findByUserId(userId: string, limit = 50) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
      include: {
        device: {
          select: {
            id: true,
            name: true,
            platform: true,
            os: true,
          },
        },
      },
    });
  }

  async markLogout(userId: string, sessionCreatedAt: Date) {
    await this.prisma.loginHistory.updateMany({
      where: { userId, logoutAt: null, loginAt: { gte: sessionCreatedAt } },
      data: { logoutAt: new Date() },
    });
  }

  async getRecentFailedAttempts(userId: string, since: Date) {
    return this.prisma.loginHistory.count({
      where: {
        userId,
        isSuccess: false,
        loginAt: { gte: since },
      },
    });
  }
}
