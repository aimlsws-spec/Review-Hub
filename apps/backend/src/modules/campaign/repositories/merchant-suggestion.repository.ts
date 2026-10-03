import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** One suggestion to store for a merchant. */
export interface NewMerchantSuggestion {
  merchantId: string;
  campaignId?: string | null;
  code: string;
  severity: string;
  title: string;
  detail: string;
}

@Injectable()
export class MerchantSuggestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Merchants with at least one running campaign, and the user who owns each (to notify). */
  async findMerchantsWithActiveCampaigns(): Promise<Array<{ id: string; userId: string }>> {
    return this.prisma.merchant.findMany({
      where: { deletedAt: null, campaigns: { some: { status: 'ACTIVE', deletedAt: null } } },
      select: { id: true, userId: true },
    });
  }

  /** True when the same suggestion (code and campaign) was stored for this merchant since `since`. */
  async existsSince(merchantId: string, code: string, campaignId: string | null, since: Date): Promise<boolean> {
    const count = await this.prisma.merchantSuggestion.count({ where: { merchantId, code, campaignId, createdAt: { gte: since } } });
    return count > 0;
  }

  async create(suggestion: NewMerchantSuggestion) {
    return this.prisma.merchantSuggestion.create({
      data: {
        merchant: { connect: { id: suggestion.merchantId } },
        campaignId: suggestion.campaignId ?? null,
        code: suggestion.code,
        severity: suggestion.severity,
        title: suggestion.title,
        detail: suggestion.detail,
      },
    });
  }

  /** The merchant's suggestions not yet dismissed, newest first. */
  async findOpen(merchantId: string, take: number) {
    return this.prisma.merchantSuggestion.findMany({
      where: { merchantId, dismissedAt: null },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /** Dismisses one of the merchant's own suggestions. False when it is not theirs or already dismissed. */
  async dismiss(merchantId: string, suggestionId: string): Promise<boolean> {
    const result = await this.prisma.merchantSuggestion.updateMany({
      where: { id: suggestionId, merchantId, dismissedAt: null },
      data: { dismissedAt: new Date() },
    });
    return result.count === 1;
  }
}
