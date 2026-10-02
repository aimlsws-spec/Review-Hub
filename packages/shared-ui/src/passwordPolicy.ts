/**
 * The backend's password policy (PASSWORD_POLICY in apps/backend/src/modules/auth/constants): at least 10
 * characters, with an uppercase and a lowercase letter, a digit and a special character. Only for setting a password;
 * signing in with an older, shorter one still works.
 */
export const PASSWORD_MIN_LENGTH = 10

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,72}$/

export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH}+ characters, with upper and lowercase letters, a number and a symbol (!@#$%^&*)`

/** react-hook-form rules for a field that sets a new password. */
export const newPasswordRules = {
  required: 'Password is required',
  minLength: { value: PASSWORD_MIN_LENGTH, message: `Minimum ${PASSWORD_MIN_LENGTH} characters` },
  pattern: { value: PASSWORD_PATTERN, message: 'Use upper and lowercase letters, a number and a symbol (!@#$%^&*)' },
}
