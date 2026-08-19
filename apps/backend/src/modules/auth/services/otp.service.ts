import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OtpType } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { CacheService } from '../../../cache/cache.service';
import { MailService } from '../../../mail/mail.service';
import { AUTH_EVENTS, AUTH_ERRORS } from '../constants';
import { OtpRepository } from '../repositories/otp.repository';
import { UserRepository } from '../repositories/user.repository';


@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpLength: number;
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownSeconds: number;

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.otpLength = this.configService.get<number>('OTP_LENGTH', 6);
    this.otpExpiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 5);
    this.maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
    this.resendCooldownSeconds = this.configService.get<number>('OTP_RESEND_COOLDOWN_SECONDS', 60);
  }

  private generateCode(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < this.otpLength; i++) {
      code += digits[crypto.randomInt(0, digits.length)];
    }
    return code;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async sendOtp(userId: string, type: OtpType): Promise<{ message: string; expiresIn: number }> {
    const cacheKey = `otp_cooldown:${userId}:${type}`;
    const cooldownRemaining = await this.cacheService.get<number>(cacheKey);

    if (cooldownRemaining) {
      throw new BadRequestException(AUTH_ERRORS.OTP_RESEND_COOLDOWN);
    }

    await this.otpRepository.expireAllByUserAndType(userId, type);

    const plainCode = this.generateCode();
    const hashedCode = this.hashCode(plainCode);
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    await this.otpRepository.create({
      user: { connect: { id: userId } },
      type,
      code: hashedCode,
      maxAttempts: this.maxAttempts,
      expiresAt,
    });

    await this.cacheService.set(cacheKey, 1, this.resendCooldownSeconds);

    const user = await this.userRepository.findById(userId);
    if (user?.email) {
      this.mailService.send({
        to: user.email,
        subject: `Your OTP: ${plainCode}`,
        html: `<p>Your OTP is <strong>${plainCode}</strong>. It expires in ${this.otpExpiryMinutes} minutes.</p>`,
      }).catch((err: Error) => this.logger.error('Failed to send OTP email', err.message));
    }

    return { message: 'OTP sent successfully', expiresIn: this.otpExpiryMinutes * 60 };
  }

  async verifyOtp(userId: string, type: OtpType, code: string): Promise<boolean> {
    const otp = await this.otpRepository.findLatestByUserAndType(userId, type);

    if (!otp) {
      throw new BadRequestException(AUTH_ERRORS.OTP_INVALID);
    }

    if (otp.status !== 'PENDING') {
      throw new BadRequestException(AUTH_ERRORS.OTP_EXPIRED);
    }

    if (otp.expiresAt < new Date()) {
      await this.otpRepository.markExpired(otp.id);
      throw new BadRequestException(AUTH_ERRORS.OTP_EXPIRED);
    }

    await this.otpRepository.incrementAttempts(otp.id);

    if (otp.attempts + 1 >= otp.maxAttempts) {
      await this.otpRepository.markExhausted(otp.id);
      throw new BadRequestException(AUTH_ERRORS.OTP_MAX_ATTEMPTS);
    }

    const hashedInput = this.hashCode(code);
    if (otp.code !== hashedInput) {
      throw new BadRequestException(AUTH_ERRORS.OTP_INVALID);
    }

    await this.otpRepository.markVerified(otp.id);

    if (type === OtpType.EMAIL_VERIFICATION || type === OtpType.PHONE_VERIFICATION) {
      const updates: Record<string, unknown> = {};
      if (type === OtpType.EMAIL_VERIFICATION) updates.emailVerifiedAt = new Date();
      if (type === OtpType.PHONE_VERIFICATION) updates.phoneVerifiedAt = new Date();
      if (Object.keys(updates).length > 0) {
        await this.userRepository.update(userId, updates);
      }
    }

    this.eventEmitter.emit(AUTH_EVENTS.OTP_VERIFIED, { userId, type });
    return true;
  }

  async resendOtp(userId: string, type: OtpType): Promise<{ message: string; expiresIn: number }> {
    return this.sendOtp(userId, type);
  }

  async cleanupExpiredOtps(): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // Keep expired OTPs for 24h before deleting
    const count = await this.otpRepository.countExpiredBefore(cutoff);
    if (count > 0) {
      await this.otpRepository.deleteExpiredBefore(cutoff);
      this.logger.log(`Cleaned up ${count} expired OTP records`);
    }
    return { deleted: count };
  }
}
