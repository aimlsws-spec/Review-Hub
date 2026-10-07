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
  static const int passwordMaxLength = 72;
  static const String passwordHint = '$passwordMinLength+ characters, upper & lowercase, a number and a symbol';

  /// The error to show for a new password, or null when it meets the policy. Names the first rule it breaks, in the
  /// same order and wording as the backend (auth/validators/password-policy.ts) and the web portals; keep them in step.
  static String? newPasswordError(String? value) {
    if (value == null || value.isEmpty) return 'Enter a password';
    if (value.length < passwordMinLength) return 'Password must be at least $passwordMinLength characters';
    if (value.length > passwordMaxLength) return 'Password must be at most $passwordMaxLength characters';
    if (!RegExp('[A-Z]').hasMatch(value)) return 'Password must contain an uppercase letter';
    if (!RegExp('[a-z]').hasMatch(value)) return 'Password must contain a lowercase letter';
    if (!RegExp(r'\d').hasMatch(value)) return 'Password must contain a number';
    if (!RegExp(r'[!@#$%^&*]').hasMatch(value)) return 'Password must contain a special character (!@#\$%^&*)';
    return null;
  }

  static final RegExp emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  /// Indian mobile numbers, optionally with country code.
  static final RegExp phonePattern = RegExp(r'^(\+91)?[6-9]\d{9}$');
}
