import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validateStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (password.length > 72) return { valid: false, message: 'Password must not exceed 72 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain an uppercase letter' };
    if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain a lowercase letter' };
    if (!/\d/.test(password)) return { valid: false, message: 'Password must contain a number' };
    if (!/[!@#$%^&*]/.test(password)) return { valid: false, message: 'Password must contain a special character' };
    return { valid: true };
  }
}
