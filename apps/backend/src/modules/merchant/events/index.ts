export class MerchantRegisteredEvent {
  constructor(
    public readonly merchantId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly businessName: string,
  ) {}
}

export class MerchantUpdatedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

export class MerchantApprovedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly businessName: string,
    public readonly email: string,
    public readonly approvedBy: string,
  ) {}
}

export class MerchantRejectedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly businessName: string,
    public readonly email: string,
    public readonly reason: string,
  ) {}
}

export class MerchantKycUploadedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly documentType: string,
  ) {}
}

export class MerchantBankAddedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly bankAccountId: string,
    public readonly bankName: string,
  ) {}
}

export class MerchantTeamInvitedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly email: string,
    public readonly role: string,
    public readonly inviteToken: string,
  ) {}
}

export class RefundRequestedEvent {
  constructor(
    public readonly refundId: string,
    public readonly merchantId: string,
    public readonly amount: number,
  ) {}
}

export class RefundReviewedEvent {
  constructor(
    public readonly refundId: string,
    public readonly merchantId: string,
    public readonly approved: boolean,
  ) {}
}
