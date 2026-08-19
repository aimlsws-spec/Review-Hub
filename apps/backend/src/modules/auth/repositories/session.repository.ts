import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.userSession.findUnique({ where: { id } });
  }

  async findByRefreshTokenHash(hash: string) {
    return this.prisma.userSession.findFirst({ where: { refreshTokenHash: hash, status: 'ACTIVE' } });
  }

  async findActiveByUserId(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.UserSessionCreateInput) {
    return this.prisma.userSession.create({ data });
  }

  async revoke(id: string) {
    return this.prisma.userSession.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
  }

  async revokeAllByUserId(userId: string, excludeId?: string) {
    const where: Prisma.UserSessionWhereInput = { userId, status: 'ACTIVE' };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.userSession.updateMany({ where, data: { status: 'REVOKED', revokedAt: new Date() } });
  }

  async revokeExpiredSessions() {
    return this.prisma.userSession.updateMany({
      where: { expiresAt: { lt: new Date() }, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
  }

  async deleteExpiredSessions() {
    return this.prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
