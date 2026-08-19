import { CampaignStatus } from '@prisma/client';

export const DEFAULT_AI_THRESHOLD = 0.8;

/**
 * Valid status transitions for a campaign. Any transition not listed here
 * is rejected by CampaignService.transitionStatus().
 */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
  CHANGES_REQUESTED: ['PENDING_REVIEW', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'ACTIVE', 'CANCELLED'],
  SCHEDULED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: ['DRAFT'],
  EXPIRED: [],
};

export const EDITABLE_CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export const DELETABLE_CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'CANCELLED', 'REJECTED'];
