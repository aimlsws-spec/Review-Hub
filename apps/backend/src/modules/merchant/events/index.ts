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

/** Money reached a merchant's wallet by bank transfer, recorded by an admin. */
export class MerchantToppedUpEvent {
  constructor(
    public readonly merchantId: string,
    public readonly amount: number,
    public readonly bankReference: string,
    public readonly balanceAfter: number,
  ) {}
}

/** A bank-transfer top-up made in error was taken back out of a merchant's wallet. */
export class MerchantTopUpReversedEvent {
  constructor(
    public readonly merchantId: string,
    public readonly amount: number,
    public readonly reason: string,
    public readonly balanceAfter: number,
  ) {}
}

/** Auto-recharge triggered and completed immediately (mock gateway, or a future saved-payment-method charge). */
export class MerchantAutoRechargeTriggeredEvent {
  constructor(
    public readonly merchantId: string,
    public readonly amount: number,
    public readonly balanceAfter: number,
    public readonly thresholdCrossed: number,
  ) {}
}

/** Auto-recharge triggered but needs the merchant to complete payment (real Razorpay, no saved payment method yet). */
export class MerchantAutoRechargePaymentDueEvent {
  constructor(
    public readonly merchantId: string,
    public readonly amount: number,
    public readonly availableBalance: number,
    public readonly thresholdCrossed: number,
    public readonly razorpayOrderId: string,
  ) {}
}
