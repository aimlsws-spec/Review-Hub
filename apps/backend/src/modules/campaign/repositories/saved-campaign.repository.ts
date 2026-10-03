import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SavedCampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The saved campaign ids, newest first. */
  async findIdsByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { campaignId: true },
    });
    return rows.map((row) => row.campaignId);
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.savedCampaign.count({ where: { userId } });
  }

  async exists(userId: string, campaignId: string): Promise<boolean> {
    const row = await this.prisma.savedCampaign.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
      select: { id: true },
    });
    return row !== null;
  }

  /**
   * Saves the campaigns, skipping any already saved. `createdAt` is spaced a millisecond apart, newest first, so a
   * list imported in one go keeps its order.
   */
  async saveMany(userId: string, campaignIdsNewestFirst: string[]): Promise<void> {
    if (campaignIdsNewestFirst.length === 0) return;
    const now = Date.now();
    await this.prisma.savedCampaign.createMany({
      data: campaignIdsNewestFirst.map((campaignId, i) => ({ userId, campaignId, createdAt: new Date(now - i) })),
      skipDuplicates: true,
    });
  }

  async remove(userId: string, campaignId: string): Promise<void> {
    await this.prisma.savedCampaign.deleteMany({ where: { userId, campaignId } });
  }
}
