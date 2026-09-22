export class RewardCreditedEvent {
  constructor(
    public readonly userId: string,
    public readonly rewardId: string,
    public readonly amount: number,
  ) {}
}

export class RewardReversedEvent {
  constructor(
    public readonly userId: string,
    public readonly rewardId: string,
    public readonly reversedAmount: number,
    public readonly shortfallAmount: number,
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

/** The money reached the user (by the gateway, or sent by an admin who recorded the bank's reference). */
export class WithdrawalPaidEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reference?: string,
  ) {}
}

/** The payout did not happen and the money went back to the user's available balance. */
export class WithdrawalFailedEvent {
  constructor(
    public readonly withdrawalId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
