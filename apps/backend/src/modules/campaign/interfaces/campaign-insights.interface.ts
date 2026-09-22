import { CampaignType } from '@prisma/client';

import { InsightCode, InsightSeverity } from '../constants/campaign-insights.constants';

/**
 * How one campaign is doing, counted from the records themselves (who joined, who finished, what was paid).
 * These are not read from the CampaignAnalytics table, which nothing fills in.
 */
export interface CampaignPerformance {
  campaignId: string;
  joins: number;
  /** Participants who completed the campaign. */
  finished: number;
  /** finished / joins, 0 to 1; 0 when nobody joined. */
  completionRate: number;
  /** Rewards actually credited: one per approved task. */
  completions: number;
  rewardsPaid: number;
}

export interface InsightSuggestion {
  code: InsightCode;
  severity: InsightSeverity;
  title: string;
  detail: string;
  campaignId?: string;
}

export interface CampaignTypeResult {
  campaignType: CampaignType;
  campaigns: number;
  joins: number;
  completions: number;
  rewardsPaid: number;
  /** Null until there is at least one completed task to divide by. */
  costPerCompletion: number | null;
  completionRate: number;
}

export interface MerchantInsights {
  windowDays: number;
  summary: {
    campaignsAnalysed: number;
    joins: number;
    completions: number;
    rewardsPaid: number;
    costPerCompletion: number | null;
    /** The merchant commission rate as a fraction (0.1 = 10%). */
    platformFeeRate: number;
    /** Billed separately at settlement on what is spent. */
    estimatedPlatformFee: number;
    completionRate: number;
    /** Share of reviewed submissions that were approved; null when too few were reviewed. */
    approvalRate: number | null;
  };
  byType: CampaignTypeResult[];
  suggestions: InsightSuggestion[];
  /** Says plainly what the numbers do and do not include. */
  note: string;
}
