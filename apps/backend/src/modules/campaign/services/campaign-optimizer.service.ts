import { Injectable, Logger } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';
import { describeError } from '@common/utils';

import { NotificationQueueService } from '../../notification/services';
import { MerchantSuggestionRepository } from '../repositories/merchant-suggestion.repository';

import { MerchantInsightsService } from './merchant-insights.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The same suggestion for the same campaign is not stored or sent again within this many days. */
export const SUGGESTION_REPEAT_DAYS = 7;

/** Most open suggestions shown to a merchant at once. */
export const OPEN_SUGGESTIONS_LIMIT = 20;

/**
 * The daily campaign optimizer (platform job campaign-optimizer): runs the same rules as the on-demand insights for
 * every merchant with a running campaign, keeps what is new, and tells the merchant when there is something new.
 * Numbers come from CampaignPerformanceService through the insights; the CampaignAnalytics table is never used
 * (nothing writes it).
 */
@Injectable()
export class CampaignOptimizerService {
  private readonly logger = new Logger(CampaignOptimizerService.name);

  constructor(
    private readonly insightsService: MerchantInsightsService,
    private readonly suggestionRepository: MerchantSuggestionRepository,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  /** One merchant failing is logged and skipped, so it never stops the others. */
  async run(now: Date = new Date()): Promise<{ merchants: number; newSuggestions: number; notified: number; failed: number }> {
    const merchants = await this.suggestionRepository.findMerchantsWithActiveCampaigns();
    const since = new Date(now.getTime() - SUGGESTION_REPEAT_DAYS * DAY_MS);
    const counts = { merchants: merchants.length, newSuggestions: 0, notified: 0, failed: 0 };

    for (const merchant of merchants) {
      try {
        const { suggestions } = await this.insightsService.getInsights(merchant.id);
        const fresh = [];
        for (const suggestion of suggestions) {
          const campaignId = suggestion.campaignId ?? null;
          if (await this.suggestionRepository.existsSince(merchant.id, suggestion.code, campaignId, since)) continue;
          fresh.push(await this.suggestionRepository.create({ merchantId: merchant.id, campaignId, ...suggestion }));
        }
        counts.newSuggestions += fresh.length;
        if (fresh.length > 0) {
          await this.notificationQueue.enqueue({
            userId: merchant.userId,
            type: 'CAMPAIGN',
            title: fresh.length === 1 ? 'A new suggestion for your campaigns' : `${fresh.length} new suggestions for your campaigns`,
            message: fresh.length === 1 ? fresh[0].title : `${fresh[0].title}, and ${fresh.length - 1} more. See them on your dashboard.`,
            channels: ['IN_APP', 'EMAIL'],
            data: { merchantId: merchant.id },
          });
          counts.notified += 1;
        }
      } catch (error) {
        counts.failed += 1;
        this.logger.error(`Campaign optimizer failed for merchant ${merchant.id}: ${describeError(error)}`);
      }
    }
    this.logger.log(`Campaign optimizer: ${JSON.stringify(counts)}`);
    return counts;
  }

  async listOpen(merchantId: string) {
    return this.suggestionRepository.findOpen(merchantId, OPEN_SUGGESTIONS_LIMIT);
  }

  async dismiss(merchantId: string, suggestionId: string) {
    const dismissed = await this.suggestionRepository.dismiss(merchantId, suggestionId);
    if (!dismissed) throw new NotFoundException('Suggestion');
    return { dismissed: true };
  }
}
