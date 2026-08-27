class AppConstants {
  AppConstants._();

  static const String appName = 'VIRAL KAR';

  static const int defaultPageSize = 20;

  static const int otpLength = 6;
  static const Duration otpResendCooldown = Duration(seconds: 60);
  static const Duration otpExpiry = Duration(minutes: 5);

  /// Mirrors the backend's password policy (see auth/dto/reset-password.dto.ts):
  /// min 8 chars, at least one uppercase, lowercase, digit, and special character.
  static final RegExp passwordPattern =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,72}$');

  static final RegExp emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  /// Indian mobile numbers, optionally with country code.
  static final RegExp phonePattern = RegExp(r'^(\+91)?[6-9]\d{9}$');
}
