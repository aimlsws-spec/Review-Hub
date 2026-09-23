export class CampaignTaskCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly campaignId: string,
  ) {}
}

export class TaskStartedEvent {
  constructor(
    public readonly taskId: string,
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly participantId: string,
  ) {}
}

export class TaskSubmittedEvent {
  constructor(
    public readonly submissionId: string,
    public readonly taskId: string,
    public readonly campaignId: string,
    public readonly userId: string,
  ) {}
}

export class SubmissionApprovedEvent {
  constructor(
    public readonly submissionId: string,
    public readonly taskId: string,
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly rewardAmount: number,
  ) {}
}

export class SubmissionRejectedEvent {
  constructor(
    public readonly submissionId: string,
    public readonly taskId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) {}
}
export class DisputeResolvedEvent {
  constructor(
    public readonly disputeId: string,
    public readonly submissionId: string,
    public readonly userId: string,
    public readonly decision: 'UPHELD' | 'REVERSED',
    public readonly notes?: string,
  ) {}
}

export class DisputeOpenedEvent {
  constructor(
    public readonly disputeId: string,
    public readonly submissionId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) {}
}
