class AppConstants {
  AppConstants._();

  static const String appName = 'Viralkar';

  static const int defaultPageSize = 20;

  static const int otpLength = 6;
  static const Duration otpResendCooldown = Duration(seconds: 60);
  static const Duration otpExpiry = Duration(minutes: 5);

  /// Mirrors the backend's password policy (PASSWORD_POLICY in auth/constants): at least 10 characters, with an
  /// uppercase and a lowercase letter, a digit and a special character. Only for setting a password; signing in
  /// with an older, shorter one still works.
  static const int passwordMinLength = 10;
  static final RegExp passwordPattern =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,72}$');
  static const String passwordHint = '$passwordMinLength+ characters, upper & lowercase, a number and a symbol';

  /// The error to show for a new password, or null when it meets the policy.
  static String? newPasswordError(String? value) {
    if (value == null || value.isEmpty) return 'Enter a password';
    if (value.length < passwordMinLength) return 'Use at least $passwordMinLength characters';
    if (!passwordPattern.hasMatch(value)) return 'Must include upper, lower, number & symbol';
    return null;
  }

  static final RegExp emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  /// Indian mobile numbers, optionally with country code.
  static final RegExp phonePattern = RegExp(r'^(\+91)?[6-9]\d{9}$');
}
