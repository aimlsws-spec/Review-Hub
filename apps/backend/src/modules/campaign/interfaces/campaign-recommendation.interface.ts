import { CampaignType, RewardType } from '@prisma/client';

import { CampaignGoal } from '../constants/campaign-builder.constants';

/** Where the suggested reward came from, so the merchant knows how much to trust it. */
export type RewardBenchmarkSource = 'platform-history' | 'defaults';

/** A draft that can be sent to `POST /merchants/:merchantId/campaigns` as it is, or after the merchant edits it. */
export interface CampaignDraft {
  title: string;
  shortDescription: string;
  description: string;
  campaignType: CampaignType;
  rewardType: RewardType;
  rewardAmount: number;
  totalBudget: number;
  maxParticipants: number;
  minimumFollowers: number;
  startAt: string;
  endAt: string;
  autoApprove: boolean;
}

export interface CampaignCostEstimate {
  participants: number;
  /** Paid out to participants; this is what the campaign budget covers. */
  rewardSpend: number;
  /** The merchant's commission rate as a fraction (0.1 = 10%). */
  platformFeeRate: number;
  /** Billed separately at settlement on what is actually spent, so it is not part of the campaign budget. */
  estimatedPlatformFee: number;
  totalEstimatedCost: number;
}

export interface CampaignRecommendation {
  goal: CampaignGoal;
  draft: CampaignDraft;
  estimate: CampaignCostEstimate;
  benchmark: { source: RewardBenchmarkSource; sampleSize: number };
  /** Why each choice was made, in plain words. */
  rationale: string[];
  /** Things the merchant should think about before creating the campaign. */
  warnings: string[];
}
