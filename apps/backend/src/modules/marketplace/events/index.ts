export class MarketplaceRedeemedEvent {
  constructor(
    public readonly userId: string,
    public readonly redemptionId: string,
    public readonly itemTitle: string,
    public readonly costAmount: number,
  ) {}
}
