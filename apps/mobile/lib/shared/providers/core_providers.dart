import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/constants/storage_keys.dart';
import '../../core/network/dio_client.dart';
import '../../core/network/token_storage.dart';

/// Raw platform keychain/keystore access — prefer [tokenStorageProvider] in
/// feature code.
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  // v11's AndroidOptions always uses encrypted storage — no toggle needed anymore.
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(),
  );
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(secureStorageProvider));
});

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
    onSessionExpired: () async {
      ref.read(sessionExpiredProvider.notifier).state++;
      await tokenStorage.clear();
    },
  );
});

/// Bumped every time a refresh-token failure forces a logout, so the router
/// (or any listener) can react without the network layer depending on
/// navigation directly.
final sessionExpiredProvider = StateProvider<int>((ref) => 0);
