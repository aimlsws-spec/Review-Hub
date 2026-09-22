import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

/// How a check of "is this the phone's owner?" ended.
enum DeviceAuthResult {
  /// They proved it: fingerprint, face, or the phone's PIN, pattern or password.
  success,

  /// The check ran and it did not match.
  failed,

  /// They closed the prompt, or the system did. Nothing was decided.
  canceled,

  /// The phone can not do the check (no screen lock is set, or the hardware is gone).
  unavailable,
}

/// Asks the phone to confirm its owner. The one thing the app lock needs from the platform, kept behind a small
/// interface so the rest of the app, and its tests, never touch the plugin.
abstract class DeviceAuthenticator {
  /// Whether the phone can confirm its owner at all: a fingerprint or face is set up, or at least a screen lock.
  Future<bool> isAvailable();

  Future<DeviceAuthResult> authenticate(String reason);
}

/// The real thing, over the phone's own prompt.
///
/// The phone's screen lock is accepted as well as a fingerprint or face, so a person whose fingerprint is not
/// recognised, or who has none, is never locked out of their own app.
class LocalAuthDeviceAuthenticator implements DeviceAuthenticator {
  LocalAuthDeviceAuthenticator([LocalAuthentication? plugin]) : _plugin = plugin ?? LocalAuthentication();

  final LocalAuthentication _plugin;

  @override
  Future<bool> isAvailable() async {
    try {
      return await _plugin.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<DeviceAuthResult> authenticate(String reason) async {
    try {
      final ok = await _plugin.authenticate(localizedReason: reason);
      return ok ? DeviceAuthResult.success : DeviceAuthResult.failed;
    } on LocalAuthException catch (e) {
      return switch (e.code) {
        LocalAuthExceptionCode.userCanceled ||
        LocalAuthExceptionCode.systemCanceled ||
        LocalAuthExceptionCode.timeout ||
        LocalAuthExceptionCode.authInProgress => DeviceAuthResult.canceled,
        LocalAuthExceptionCode.noCredentialsSet ||
        LocalAuthExceptionCode.noBiometricsEnrolled ||
        LocalAuthExceptionCode.noBiometricHardware ||
        LocalAuthExceptionCode.uiUnavailable => DeviceAuthResult.unavailable,
        _ => DeviceAuthResult.failed,
      };
    } on PlatformException {
      return DeviceAuthResult.failed;
    }
  }
}
