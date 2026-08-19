export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string | null,
    public readonly phone: string | null,
  ) {}
}

export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly ipAddress?: string,
  ) {}
}

export class UserLoggedOutEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId?: string,
  ) {}
}

export class PasswordChangedEvent {
  constructor(public readonly userId: string) {}
}

export class PasswordResetEvent {
  constructor(public readonly userId: string) {}
}

export class OtpVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly type: string,
  ) {}
}

export class AccountDeletedEvent {
  constructor(public readonly userId: string) {}
}

export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

export class LoginFailedEvent {
  constructor(public readonly userId: string) {}
}
