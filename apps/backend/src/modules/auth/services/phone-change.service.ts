import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OtpType } from '@prisma/client';

import { BadRequestException, ConflictException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { maskPhone } from '@common/utils';

import { CacheService } from '../../../cache/cache.service';
import { AUTH_EVENTS, PHONE_CHANGE_TTL_SECONDS } from '../constants';
import { UserRepository } from '../repositories/user.repository';

import { OtpService } from './otp.service';
import { PasswordService } from './password.service';

interface PendingPhoneChange {
  newPhone: string;
}

/**
 * Changes a signed-in user's phone number in two steps: ask for the new number (re-checking the password, since a
 * borrowed unlocked phone must not be enough), then type the code sent by SMS to that new number. The number only
 * changes once the person proves they hold it. The old number gets an SMS saying it was replaced, so a takeover
 * does not go unnoticed (sent by AuthListener on PHONE_CHANGED).
 */
@Injectable()
export class PhoneChangeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly otpService: OtpService,
    private readonly cache: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async request(userId: string, newPhone: string, currentPassword?: string): Promise<{ message: string; expiresIn: number; sentTo: string }> {
    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    if (user.passwordHash) {
      const valid = !!currentPassword && (await this.passwordService.verify(currentPassword, user.passwordHash));
      if (!valid) throw new BadRequestException('Current password is incorrect');
    }
    if (user.phone === newPhone) throw new BadRequestException('This is already your phone number');
    await this.assertPhoneFree(newPhone, userId);

    // Send first, then remember the number: if sending is refused (cooldown), the number waiting for a code must not
    // change, or a code sent to one number could confirm another.
    const { expiresIn } = await this.otpService.sendOtp(userId, OtpType.PHONE_CHANGE, newPhone);
    await this.cache.set(this.key(userId), { newPhone } satisfies PendingPhoneChange, PHONE_CHANGE_TTL_SECONDS);

    return { message: 'A code was sent to your new number', expiresIn, sentTo: maskPhone(newPhone) };
  }

  async verify(userId: string, code: string): Promise<{ phone: string }> {
    const pending = await this.cache.get<PendingPhoneChange>(this.key(userId));
    if (!pending) throw new BadRequestException('No phone number change is waiting. Please start again.');

    const user = await this.userRepository.findByIdSimple(userId);
    if (!user) throw new NotFoundException('User');

    await this.otpService.verifyOtp(userId, OtpType.PHONE_CHANGE, code);
    // Checked again: someone else may have signed up with this number while the code was on its way.
    await this.assertPhoneFree(pending.newPhone, userId);

    await this.userRepository.update(userId, { phone: pending.newPhone, phoneVerifiedAt: new Date() });
    await this.cache.del(this.key(userId));

    this.eventEmitter.emit(AUTH_EVENTS.PHONE_CHANGED, { userId, oldPhone: user.phone, newPhone: pending.newPhone });
    return { phone: pending.newPhone };
  }

  private async assertPhoneFree(phone: string, userId: string): Promise<void> {
    const owner = await this.userRepository.findByPhone(phone);
    if (owner && owner.id !== userId) throw new ConflictException('User', 'phone');
  }

  private key(userId: string): string {
    return `phone_change:${userId}`;
  }
}
