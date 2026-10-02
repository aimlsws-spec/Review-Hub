import { Injectable } from '@nestjs/common';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { AUTH_ERRORS, PASSWORD_POLICY } from '../constants';
import { PasswordHistoryRepository } from '../repositories/password-history.repository';

import { PasswordService } from './password.service';

/**
 * Stops a password change or reset from reusing one of the user's last few passwords (spec: password history, last
 * 5). Why it matters: after a leak or a phishing scare, "change your password" only helps if the user can't just
 * set the leaked one again.
 */
@Injectable()
export class PasswordHistoryService {
  constructor(
    private readonly repository: PasswordHistoryRepository,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Throws when `newPassword` matches the current password or any stored previous one within the history depth.
   * bcrypt hashes are salted, so the only way to compare is to verify against each one; they run in parallel.
   */
  async assertNotRecentlyUsed(userId: string, newPassword: string, currentHash: string | null): Promise<void> {
    const previous = await this.repository.findRecentHashes(userId, PASSWORD_POLICY.HISTORY_DEPTH - 1);
    const hashes = currentHash ? [currentHash, ...previous] : previous;
    const matches = await Promise.all(hashes.map((hash) => this.passwordService.verify(newPassword, hash)));

    if (matches.some(Boolean)) {
      throw new BadRequestException(
        `You have used this password recently. Choose one that is different from your last ${PASSWORD_POLICY.HISTORY_DEPTH} passwords.`,
        AUTH_ERRORS.PASSWORD_RECENTLY_USED,
      );
    }
  }

  /**
   * Remembers the password being replaced. Together with the current password this keeps exactly HISTORY_DEPTH
   * passwords to check against. Accounts that never had a password (Google/OTP sign-in) have nothing to remember.
   */
  async remember(userId: string, replacedHash: string | null): Promise<void> {
    if (!replacedHash) return;
    await this.repository.addAndPrune(userId, replacedHash, PASSWORD_POLICY.HISTORY_DEPTH - 1);
  }
}
