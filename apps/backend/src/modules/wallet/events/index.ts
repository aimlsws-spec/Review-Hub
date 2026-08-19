export class RewardCreditedEvent {
  constructor(
    public readonly userId: string,
    public readonly rewardId: string,
    public readonly amount: number,
  ) {}
}

export class WithdrawalRequestedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly amount: number,
  ) {}
}

export class WithdrawalReviewedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly approved: boolean,
  ) {}
}
