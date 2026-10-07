import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { maskPhone } from '@common/utils';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailQueueService } from '../../../mail/email-queue.service';
import { SmsService } from '../../../sms/sms.service';
import { AUTH_EVENTS } from '../constants';
import {
  buildAccountDeletedEmail,
  buildNewSignInEmail,
  buildPasswordChangedEmail,
  buildPhoneChangedEmail,
  buildWelcomeEmail,
} from '../emails/account-emails';

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  @OnEvent(AUTH_EVENTS.USER_REGISTERED)
  async handleUserRegistered(payload: {
    userId: string;
    email: string | null;
    phone: string | null;
    firstName?: string | null;
    emailVerified?: boolean;
  }) {
    this.logger.log(`User registered: ${payload.userId}`);

    // A password sign-up's first email is its verification code; the welcome follows once the address is verified
    // (handleOtpVerified). A Google sign-up arrives verified, so it is welcomed straight away.
    if (payload.email && payload.emailVerified) this.sendWelcome(payload.email, payload.firstName);

    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'USER_REGISTERED',
        module: 'AUTH',
        description: 'User registered successfully',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'CREATE',
      },
    });
  }

  @OnEvent(AUTH_EVENTS.USER_LOGGED_IN)
  async handleUserLoggedIn(payload: { userId: string; ipAddress?: string }) {
    this.logger.log(`User logged in: ${payload.userId}`);

    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'LOGIN',
        module: 'AUTH',
        description: 'User logged in',
        ipAddress: payload.ipAddress,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'LOGIN',
        ipAddress: payload.ipAddress,
      },
    });
  }

  @OnEvent(AUTH_EVENTS.USER_LOGGED_OUT)
  async handleUserLoggedOut(payload: { userId: string; sessionId?: string }) {
    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'LOGOUT',
        module: 'AUTH',
        description: 'User logged out',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'LOGOUT',
      },
    });
  }

  @OnEvent(AUTH_EVENTS.PASSWORD_CHANGED)
  async handlePasswordChanged(payload: { userId: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true, firstName: true } });
    if (user?.email) {
      this.emailQueueService
        .enqueue({ to: user.email, ...buildPasswordChangedEmail(user.firstName, new Date()) })
        .catch((err: Error) => this.logger.error('Password change alert email enqueue failed', err.message));
    }

    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'PASSWORD_CHANGE',
        module: 'AUTH',
        description: 'User changed password',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'UPDATE',
      },
    });
  }

  @OnEvent(AUTH_EVENTS.PASSWORD_RESET)
  async handlePasswordReset(payload: { userId: string }) {
    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'PASSWORD_RESET',
        module: 'AUTH',
        description: 'User reset password',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'UPDATE',
      },
    });
  }

  @OnEvent(AUTH_EVENTS.OTP_VERIFIED)
  async handleOtpVerified(payload: { userId: string; type: string }) {
    if (payload.type === 'EMAIL_VERIFICATION') {
      const user = await this.prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true, firstName: true } });
      if (user?.email) this.sendWelcome(user.email, user.firstName);
    }

    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'OTP_VERIFIED',
        module: 'AUTH',
        description: `OTP verified for ${payload.type}`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'Otp',
        action: 'VERIFY',
      },
    });
  }

  @OnEvent(AUTH_EVENTS.ACCOUNT_DELETED)
  async handleAccountDeleted(payload: { userId: string; email?: string | null }) {
    if (payload.email) {
      this.emailQueueService
        .enqueue({ to: payload.email, ...buildAccountDeletedEmail() })
        .catch((err: Error) => this.logger.error('Account deletion email enqueue failed', err.message));
    }

    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'ACCOUNT_DELETED',
        module: 'AUTH',
        description: 'User deleted account',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'DELETE',
      },
    });
  }

  @OnEvent(AUTH_EVENTS.PROFILE_UPDATED)
  async handleProfileUpdated(payload: { userId: string; changes: Record<string, unknown> }) {
    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'PROFILE_UPDATE',
        module: 'AUTH',
        description: `Profile updated: ${Object.keys(payload.changes).join(', ')}`,
        metadata: payload.changes as unknown as Prisma.InputJsonValue,
      },
    });
  }

  @OnEvent(AUTH_EVENTS.LOGIN_FAILED)
  async handleLoginFailed(payload: { userId: string }) {
    await this.prisma.activityLog.create({
      data: {
        userId: payload.userId,
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        description: 'Failed login attempt',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'User',
        entityId: payload.userId,
        action: 'LOGIN',
      },
    });
  }

  /**
   * Security alert for a sign-in from a device the account had not used before (spec: unknown device → email alert).
   * Sent after the sign-in succeeded, so even when the attacker had the code, the owner still hears about it.
   */
  @OnEvent(AUTH_EVENTS.NEW_DEVICE_LOGIN)
  async handleNewDeviceLogin(payload: { userId: string; ipAddress?: string; deviceName?: string; os?: string; at: Date }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true, firstName: true } });
    if (user?.email) {
      const device = [payload.deviceName, payload.os].filter(Boolean).join(' on ') || 'An unknown device';
      this.emailQueueService
        .enqueue({
          to: user.email,
          ...buildNewSignInEmail({ firstName: user.firstName, device, ipAddress: payload.ipAddress ?? 'unknown', at: payload.at }),
        })
        .catch((err: Error) => this.logger.error('New device alert email enqueue failed', err.message));
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'Device',
        action: 'LOGIN',
        ipAddress: payload.ipAddress,
        after: { newDevice: true, deviceName: payload.deviceName ?? null, os: payload.os ?? null },
      },
    });
  }

  /** Tells the old number and the email address that the phone number changed, so a takeover does not go unnoticed. */
  @OnEvent(AUTH_EVENTS.PHONE_CHANGED)
  async handlePhoneChanged(payload: { userId: string; oldPhone: string | null; newPhone: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true } });
    const notice = `The phone number on your Viralkar account was changed to ${maskPhone(payload.newPhone)}. If you did not do this, contact support immediately.`;

    if (payload.oldPhone) {
      this.smsService.send(payload.oldPhone, notice).catch((err: Error) => this.logger.error('Phone change SMS failed', err.message));
    }
    if (user?.email) {
      this.emailQueueService
        .enqueue({ to: user.email, ...buildPhoneChangedEmail(maskPhone(payload.newPhone)) })
        .catch((err: Error) => this.logger.error('Phone change email enqueue failed', err.message));
    }

    // Logged as "a detail changed", never with the numbers themselves.
    await this.prisma.auditLog.create({
      data: { actorId: payload.userId, actorType: 'USER', entity: 'User', entityId: payload.userId, action: 'UPDATE', after: { changed: ['phone'] } },
    });
  }

  /** Keeps the acceptance of legal documents in the audit trail as well as in its own table. */
  @OnEvent(AUTH_EVENTS.POLICIES_ACCEPTED)
  async handlePoliciesAccepted(payload: { userId: string; ipAddress?: string; documents: { policy: string; version: string }[] }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: payload.userId,
        actorType: 'USER',
        entity: 'PolicyAcceptance',
        entityId: payload.userId,
        action: 'CREATE',
        ipAddress: payload.ipAddress,
        after: { documents: payload.documents } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** The welcome email: sent once per account, when its email address is first known to be real. */
  private sendWelcome(email: string, firstName?: string | null): void {
    this.emailQueueService
      .enqueue({ to: email, ...buildWelcomeEmail(firstName) })
      .catch((err: Error) => this.logger.error('Welcome email enqueue failed', err.message));
  }
}
