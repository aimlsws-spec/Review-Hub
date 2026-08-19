import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailQueueService } from '../../../mail/email-queue.service';
import { AUTH_EVENTS } from '../constants';

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(AUTH_EVENTS.USER_REGISTERED)
  async handleUserRegistered(payload: { userId: string; email: string | null; phone: string | null }) {
    this.logger.log(`User registered: ${payload.userId}`);

    if (payload.email) {
      this.emailQueueService
        .enqueue({
          to: payload.email,
          subject: 'Welcome to Viral Kar!',
          html: '<h1>Welcome!</h1><p>Thank you for registering on Viral Kar platform.</p>',
        })
        .catch((err: Error) => this.logger.error('Welcome email enqueue failed', err.message));
    }

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
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true } });
    if (user?.email) {
      this.emailQueueService
        .enqueue({
          to: user.email,
          subject: 'Password Changed - Security Alert',
          html: '<h1>Password Changed</h1><p>Your password was successfully changed.</p>',
        })
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
  async handleAccountDeleted(payload: { userId: string }) {
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
}
