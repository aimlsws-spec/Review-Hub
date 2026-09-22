import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/constants/storage_keys.dart';
import '../../core/network/app_version_source.dart';
import '../../core/network/device_id_storage.dart';
import '../../core/network/dio_client.dart';
import '../../core/network/token_storage.dart';

/// Raw platform keychain/keystore access — prefer [tokenStorageProvider] in
/// feature code.
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  // AndroidOptions always uses encrypted storage since v10 — no toggle needed.
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(),
  );
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(secureStorageProvider));
});

/// The install id the backend receives as `X-Device-ID`.
final deviceIdStorageProvider = Provider<DeviceIdStorage>((ref) {
  return DeviceIdStorage(ref.watch(secureStorageProvider));
});

/// The version of this build, sent to the backend as `X-App-Version`.
final appVersionSourceProvider = Provider<AppVersionSource>((ref) => AppVersionSource());

/// The Hive box for small, non-sensitive app state (onboarding flag, theme,
/// language). Must be opened in `main()` before this provider is read —
/// see `main.dart`.
final settingsBoxProvider = Provider<Box>((ref) {
  return Hive.box(StorageKeys.settingsBox);
});

/// The configured Dio instance every repository depends on. Session
/// expiry (refresh token rejected) is surfaced through [sessionExpiredProvider]
/// rather than a direct callback here, so any part of the app can react to it.
final dioProvider = Provider<Dio>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  return DioClientFactory.create(
    tokenStorage: tokenStorage,
    deviceIdStorage: ref.watch(deviceIdStorageProvider),
    appVersionSource: ref.watch(appVersionSourceProvider),
    onSessionExpired: () async {
      ref.read(sessionExpiredProvider.notifier).state++;
      await tokenStorage.clear();
    },
    // Kept as a counter, like the session signal, so the network layer does not depend on any screen.
    onAppUnavailable: () => ref.read(appUnavailableSignalProvider.notifier).state++,
  );
});

/// Bumped every time a refresh-token failure forces a logout, so the router
/// (or any listener) can react without the network layer depending on
/// navigation directly.
final sessionExpiredProvider = StateProvider<int>((ref) => 0);

/// Bumped when the backend refuses a request because the platform is in maintenance or this build is too old, so the
/// app can look up which one it is and show the right screen.
final appUnavailableSignalProvider = StateProvider<int>((ref) => 0);

/// Keeps the splash screen visible for a minimum stretch. Without this, the
/// router's redirect (see `app_router.dart`) can resolve `authStateProvider`
/// in a single frame, making the splash screen flash by unnoticed.
final splashMinDurationProvider = FutureProvider<void>((ref) {
  return Future.delayed(const Duration(milliseconds: 3000));
});
