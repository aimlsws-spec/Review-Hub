export class LevelUpEvent {
  constructor(
    public readonly userId: string,
    public readonly newLevel: number,
  ) {}
}

export class BadgeEarnedEvent {
  constructor(
    public readonly userId: string,
    public readonly badgeId: string,
    public readonly badgeName: string,
  ) {}
}

export class DailyRewardClaimedEvent {
  constructor(
    public readonly userId: string,
    public readonly prizeLabel: string,
    public readonly amount: number,
  ) {}
}
