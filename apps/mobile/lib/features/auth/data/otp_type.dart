/// Mirrors the backend's `OtpType` Prisma enum exactly.
enum OtpType {
  registration('REGISTRATION'),
  passwordReset('PASSWORD_RESET'),
  twoFactor('TWO_FACTOR'),
  emailVerification('EMAIL_VERIFICATION'),
  phoneVerification('PHONE_VERIFICATION');

  const OtpType(this.value);
  final String value;
}
