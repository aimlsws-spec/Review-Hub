import 'package:flutter/services.dart';

/// What the phone reports about itself: whether it looks rooted, and whether the app is on an emulator.
///
/// These are signs, not proof. Anyone who controls the phone can hide them, so the backend counts them as one input
/// to a risk score (a risky device has its withdrawals held for review) and never as a verdict.
class DeviceIntegrity {
  const DeviceIntegrity({this.isRooted = false, this.isEmulator = false});

  final bool isRooted;
  final bool isEmulator;
}

/// Asks the phone whether it looks rooted or emulated.
abstract class DeviceIntegrityChecker {
  Future<DeviceIntegrity> check();
}

/// The Android checks, over a method channel to `DeviceIntegrity.kt`.
///
/// When the answer can not be had (the native side is missing, on a platform without it, or fails) the phone is taken
/// as clean. A wrong "risky" holds a real person's withdrawal, while a missing answer only means one fewer signal.
class PlatformDeviceIntegrityChecker implements DeviceIntegrityChecker {
  PlatformDeviceIntegrityChecker({MethodChannel? channel}) : _channel = channel ?? const MethodChannel(channelName);

  static const channelName = 'com.seawindsolution.viralkar/device_integrity';

  final MethodChannel _channel;
  Future<DeviceIntegrity>? _result;

  /// The phone does not change while the app runs, so it is asked once.
  @override
  Future<DeviceIntegrity> check() => _result ??= _ask();

  Future<DeviceIntegrity> _ask() async {
    try {
      final reply = await _channel.invokeMapMethod<String, dynamic>('check');
      if (reply == null) return const DeviceIntegrity();
      // Only a real true counts; anything else is "no".
      return DeviceIntegrity(isRooted: reply['isRooted'] == true, isEmulator: reply['isEmulator'] == true);
    } on PlatformException {
      return const DeviceIntegrity();
    } on MissingPluginException {
      return const DeviceIntegrity();
    }
  }
}
