import { CampaignStatus } from '@prisma/client';

export * from './campaign-builder.constants';
export * from './campaign-insights.constants';
export * from './enabled-types.constants';

export const DEFAULT_AI_THRESHOLD = 0.8;

/**
 * How many campaigns one person may save for later. Kept short on purpose: the app's saved view fetches each one when it
 * opens, so the list must stay quick. The mobile app has the same number (SavedCampaignsStore.maxSaved).
 */
export const SAVED_CAMPAIGNS_MAX = 30;

/**
 * Valid status transitions for a campaign. Any transition not listed here
 * is rejected by CampaignService.transitionStatus().
 */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'CANCELLED'],
  // The merchant may withdraw it while it waits: nothing is reserved until it is activated.
  PENDING_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'CANCELLED'],
  CHANGES_REQUESTED: ['PENDING_REVIEW', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'ACTIVE', 'CANCELLED'],
  SCHEDULED: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  PAUSED: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: ['DRAFT'],
  EXPIRED: [],
};

export const EDITABLE_CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export const DELETABLE_CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'CANCELLED', 'REJECTED'];

/** A campaign's cover image (CampaignCoverService): kept in the publicly served uploads/campaign folder. */
export const CAMPAIGN_COVER = {
  FOLDER: 'campaign',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
};
