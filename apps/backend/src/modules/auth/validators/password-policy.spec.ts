import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ChangePasswordDto } from '../dto/change-password.dto';

import { findPasswordPolicyViolation } from './password-policy';

/** The messages a ChangePasswordDto with this new password fails validation with. */
function newPasswordErrors(newPassword: string): string[] {
  const dto = plainToInstance(ChangePasswordDto, { currentPassword: 'Old@123456', newPassword });
  return validateSync(dto).flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('password policy', () => {
  it.each([
    ['short1!', 'Password must be at least 10 characters'],
    ['alllowercase1!', 'Password must contain an uppercase letter'],
    ['ALLUPPERCASE1!', 'Password must contain a lowercase letter'],
    ['NoDigits!!!!', 'Password must contain a number'],
    ['NoSymbol1234', 'Password must contain a special character (!@#$%^&*)'],
    [`Aa1!${'a'.repeat(69)}`, 'Password must be at most 72 characters'],
  ])('rejects %s with only the rule it breaks', (password, message) => {
    expect(findPasswordPolicyViolation(password)).toBe(message);
    expect(newPasswordErrors(password)).toEqual([message]);
  });

  it('accepts a password that meets every rule', () => {
    expect(findPasswordPolicyViolation('Strong@1234')).toBeNull();
    expect(newPasswordErrors('Strong@1234')).toEqual([]);
  });

  it('rejects a value that is not a string', () => {
    expect(findPasswordPolicyViolation(12345678901)).toBe('Password must be a string');
  });
});
