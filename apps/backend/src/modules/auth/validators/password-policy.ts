import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

import { PASSWORD_POLICY } from '../constants';

/**
 * The rules a new password must meet, checked in this order. Each has its own message so the person is told exactly
 * what to fix instead of the whole policy. The same wording is used by the web portals (shared-ui passwordPolicy.ts)
 * and the mobile app (AppConstants.newPasswordError); keep the three in step.
 */
const PASSWORD_RULES: ReadonlyArray<{ test: (password: string) => boolean; message: string }> = [
  {
    test: (p) => p.length >= PASSWORD_POLICY.MIN_LENGTH,
    message: `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`,
  },
  {
    test: (p) => p.length <= PASSWORD_POLICY.MAX_LENGTH,
    message: `Password must be at most ${PASSWORD_POLICY.MAX_LENGTH} characters`,
  },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must contain an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must contain a lowercase letter' },
  { test: (p) => /\d/.test(p), message: 'Password must contain a number' },
  { test: (p) => /[!@#$%^&*]/.test(p), message: 'Password must contain a special character (!@#$%^&*)' },
];

/** The message for the first password rule `value` breaks, or null when it meets the whole policy. */
export function findPasswordPolicyViolation(value: unknown): string | null {
  if (typeof value !== 'string') return 'Password must be a string';
  return PASSWORD_RULES.find((rule) => !rule.test(value))?.message ?? null;
}

/** Validates a new password against PASSWORD_POLICY, reporting the specific rule that is missing. */
export function IsPolicyPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isPolicyPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown): boolean => findPasswordPolicyViolation(value) === null,
        defaultMessage: (args?: ValidationArguments): string =>
          findPasswordPolicyViolation(args?.value) ?? 'Password does not meet the password policy',
      },
    });
  };
}
