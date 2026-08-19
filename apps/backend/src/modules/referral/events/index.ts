export class ReferralAttributedEvent {
  constructor(
    public readonly referralId: string,
    public readonly referrerId: string,
    public readonly referredUserId: string,
  ) {}
}

export class ReferralRewardedEvent {
  constructor(
    public readonly referralId: string,
    public readonly referrerId: string,
    public readonly amount: number,
  ) {}
}
