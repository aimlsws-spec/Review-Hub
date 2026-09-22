import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/core_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../data/app_lock_store.dart';
import '../data/device_authenticator.dart';

final appLockStoreProvider = Provider<AppLockStore>((ref) => AppLockStore(ref.watch(settingsBoxProvider)));

final deviceAuthenticatorProvider = Provider<DeviceAuthenticator>((ref) => LocalAuthDeviceAuthenticator());

/// How long the app can be out of sight before it locks. Short trips (answering a message, checking a code) do not
/// ask for a fingerprint each time; a real absence does.
final appLockGraceProvider = Provider<Duration>((ref) => const Duration(seconds: 30));

/// The pause between the lock screen appearing and the phone's prompt opening, so the prompt does not fight the
/// app's own start-up.
final appLockPromptDelayProvider = Provider<Duration>((ref) => const Duration(milliseconds: 400));

/// The current time. A provider so a test can move it.
final appLockClockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// What happened when the person asked to turn the app lock on or off.
enum AppLockChange {
  done,

  /// This phone has no screen lock or biometrics to check against.
  notSupported,

  /// They did not confirm, so nothing changed.
  notConfirmed,
}

class AppLockState {
  const AppLockState({this.enabled = false, this.locked = false, this.checking = false, this.message});

  /// The person turned the app lock on.
  final bool enabled;

  /// The app is covered until they prove who they are.
  final bool locked;

  /// The phone's prompt is open.
  final bool checking;

  /// Why the last attempt did not unlock, if it did not.
  final String? message;

  AppLockState copyWith({bool? enabled, bool? locked, bool? checking, String? message, bool clearMessage = false}) {
    return AppLockState(
      enabled: enabled ?? this.enabled,
      locked: locked ?? this.locked,
      checking: checking ?? this.checking,
      message: clearMessage ? null : (message ?? this.message),
    );
  }
}

final appLockProvider = NotifierProvider<AppLockNotifier, AppLockState>(AppLockNotifier.new);

/// An optional lock over the app: when it is on, the app asks the phone to confirm its owner when it starts and
/// whenever it comes back after a real absence.
///
/// It is a second door for someone who has borrowed an unlocked phone; it does not replace signing in. It is switched
/// off when the person signs out, so the next person to sign in on this phone does not inherit it.
class AppLockNotifier extends Notifier<AppLockState> {
  DateTime? _leftAt;

  @override
  AppLockState build() {
    final enabled = ref.read(appLockStoreProvider).isEnabled;

    final lifecycle = AppLifecycleListener(onStateChange: _onLifecycle);
    ref.onDispose(lifecycle.dispose);

    ref.listen(authStateProvider, (previous, next) {
      final wasSignedIn = previous?.value != null;
      final isSignedIn = next.value != null;
      if (wasSignedIn && !isSignedIn) unawaited(_reset());
      // A cold start is locked before the session has been restored; the prompt waits until there is someone to lock.
      if (!wasSignedIn && isSignedIn && state.enabled && state.locked) _promptSoon();
    });

    if (enabled && ref.read(authStateProvider).value != null) _promptSoon();
    // Locked from the first frame, so the app is never shown before the check.
    return AppLockState(enabled: enabled, locked: enabled);
  }

  /// Opens the phone's prompt. Does nothing if the app is not locked or the prompt is already open.
  Future<void> unlock() async {
    if (!state.enabled || !state.locked || state.checking) return;
    state = state.copyWith(checking: true, clearMessage: true);

    final result = await ref.read(deviceAuthenticatorProvider).authenticate('Unlock VIRAL KAR');
    if (!ref.mounted) return;

    switch (result) {
      case DeviceAuthResult.success:
        _leftAt = null;
        state = state.copyWith(locked: false, checking: false);
      case DeviceAuthResult.canceled:
        state = state.copyWith(checking: false);
      case DeviceAuthResult.failed:
        state = state.copyWith(checking: false, message: 'That did not match. Please try again.');
      case DeviceAuthResult.unavailable:
        // The phone's own lock has been removed, so there is nothing left to check against. Keeping the app shut would
        // lock the owner out of their own account, so the lock is dropped and they can turn it on again later.
        await ref.read(appLockStoreProvider).setEnabled(false);
        if (!ref.mounted) return;
        state = const AppLockState();
    }
  }

  /// Turns the lock on, after the phone confirms it is really the owner asking.
  Future<AppLockChange> enable() async {
    if (state.checking) return AppLockChange.notConfirmed;
    if (!await ref.read(deviceAuthenticatorProvider).isAvailable()) return AppLockChange.notSupported;

    state = state.copyWith(checking: true, clearMessage: true);
    final result = await ref.read(deviceAuthenticatorProvider).authenticate('Confirm it is you to turn on the app lock');
    if (!ref.mounted) return AppLockChange.notConfirmed;

    if (result != DeviceAuthResult.success) {
      state = state.copyWith(checking: false);
      return result == DeviceAuthResult.unavailable ? AppLockChange.notSupported : AppLockChange.notConfirmed;
    }
    await ref.read(appLockStoreProvider).setEnabled(true);
    if (!ref.mounted) return AppLockChange.done;
    state = const AppLockState(enabled: true);
    return AppLockChange.done;
  }

  /// Turns the lock off. The phone confirms first, so someone holding an unlocked phone can not quietly remove it.
  Future<AppLockChange> disable() async {
    if (state.checking) return AppLockChange.notConfirmed;

    state = state.copyWith(checking: true, clearMessage: true);
    final result = await ref.read(deviceAuthenticatorProvider).authenticate('Confirm it is you to turn off the app lock');
    if (!ref.mounted) return AppLockChange.notConfirmed;

    // If the phone can no longer check, there is nothing to protect by refusing.
    if (result != DeviceAuthResult.success && result != DeviceAuthResult.unavailable) {
      state = state.copyWith(checking: false);
      return AppLockChange.notConfirmed;
    }
    await ref.read(appLockStoreProvider).setEnabled(false);
    if (!ref.mounted) return AppLockChange.done;
    state = const AppLockState();
    return AppLockChange.done;
  }

  void _onLifecycle(AppLifecycleState next) {
    switch (next) {
      case AppLifecycleState.hidden || AppLifecycleState.paused:
        // While the phone's own prompt is open the app is "inactive", never hidden, but a check that is running must
        // not be mistaken for the person having left.
        if (state.enabled && !state.locked && !state.checking) _leftAt ??= ref.read(appLockClockProvider)();
      case AppLifecycleState.resumed:
        final left = _leftAt;
        _leftAt = null;
        if (left == null || !state.enabled || state.locked || state.checking) return;
        if (ref.read(appLockClockProvider)().difference(left) >= ref.read(appLockGraceProvider)) {
          state = state.copyWith(locked: true, clearMessage: true);
          if (ref.read(authStateProvider).value != null) _promptSoon();
        }
      case AppLifecycleState.inactive || AppLifecycleState.detached:
        break;
    }
  }

  Future<void> _reset() async {
    _leftAt = null;
    await ref.read(appLockStoreProvider).setEnabled(false);
    if (ref.mounted) state = const AppLockState();
  }

  void _promptSoon() {
    unawaited(Future<void>.delayed(ref.read(appLockPromptDelayProvider), unlock));
  }
}
