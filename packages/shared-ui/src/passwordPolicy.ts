/**
 * The backend's password policy (PASSWORD_POLICY in apps/backend/src/modules/auth/constants): at least 10
 * characters, with an uppercase and a lowercase letter, a digit and a special character. Only for setting a password;
 * signing in with an older, shorter one still works.
 */
export const PASSWORD_MIN_LENGTH = 10

export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,72}$/

export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH}+ characters, with upper and lowercase letters, a number and a symbol (!@#$%^&*)`

/**
 * The policy's rules in the order they are checked, each with its own message so the person is told exactly what to
 * fix. Same wording as the backend (auth/validators/password-policy.ts) and the mobile app; keep the three in step.
 */
const PASSWORD_RULES: ReadonlyArray<{ test: (password: string) => boolean; message: string }> = [
  { test: (p) => p.length >= PASSWORD_MIN_LENGTH, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
  { test: (p) => p.length <= PASSWORD_MAX_LENGTH, message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` },
  { test: (p) => /[A-Z]/.test(p), message: 'Password must contain an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'Password must contain a lowercase letter' },
  { test: (p) => /\d/.test(p), message: 'Password must contain a number' },
  { test: (p) => /[!@#$%^&*]/.test(p), message: 'Password must contain a special character (!@#$%^&*)' },
]

/** The message for the first rule a new password breaks, or undefined when it meets the whole policy. */
export function passwordPolicyError(password: string): string | undefined {
  return PASSWORD_RULES.find((rule) => !rule.test(password))?.message
}

/** react-hook-form rules for a field that sets a new password. */
export const newPasswordRules = {
  required: 'Password is required',
  validate: (value: string) => passwordPolicyError(value) ?? true,
}
