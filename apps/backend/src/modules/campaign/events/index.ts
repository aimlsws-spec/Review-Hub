import { CampaignStatus } from '@prisma/client';

export class CampaignCreatedEvent {
  constructor(
    public readonly campaignId: string,
    public readonly merchantId: string,
    public readonly title: string,
  ) {}
}

export class CampaignUpdatedEvent {
  constructor(
    public readonly campaignId: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

export class CampaignStatusChangedEvent {
  constructor(
    public readonly campaignId: string,
    public readonly merchantId: string,
    public readonly fromStatus: CampaignStatus,
    public readonly toStatus: CampaignStatus,
  ) {}
}

export class CampaignSubmittedEvent {
  constructor(
    public readonly campaignId: string,
    public readonly merchantId: string,
    public readonly autoApproved: boolean,
  ) {}
}
