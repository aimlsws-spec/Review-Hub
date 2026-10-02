import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** Stores the bcrypt hashes of a user's previous passwords. Never the passwords themselves. */
@Injectable()
export class PasswordHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The most recent previous-password hashes, newest first. */
  async findRecentHashes(userId: string, take: number): Promise<string[]> {
    if (take <= 0) return [];
    const rows = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { passwordHash: true },
    });
    return rows.map((row) => row.passwordHash);
  }

  /** Records an outgoing password hash, then deletes everything older than the newest `keep` rows. */
  async addAndPrune(userId: string, passwordHash: string, keep: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordHistory.create({ data: { userId, passwordHash } });
      const stale = await tx.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: Math.max(keep, 0),
        select: { id: true },
      });
      if (stale.length > 0) {
        await tx.passwordHistory.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
      }
    });
  }
}
