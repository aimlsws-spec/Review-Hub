import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/storage_keys.dart';

/// Thin wrapper around [FlutterSecureStorage] for the two JWTs. Kept
/// deliberately separate from Hive (which holds non-sensitive app state) —
/// tokens live in the platform keychain/keystore instead.
class TokenStorage {
  TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  Future<String?> get accessToken => _storage.read(key: StorageKeys.accessToken);
  Future<String?> get refreshToken => _storage.read(key: StorageKeys.refreshToken);

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: StorageKeys.accessToken, value: accessToken);
    await _storage.write(key: StorageKeys.refreshToken, value: refreshToken);
  }

  Future<void> updateAccessToken(String accessToken) =>
      _storage.write(key: StorageKeys.accessToken, value: accessToken);

  Future<void> clear() async {
    await _storage.delete(key: StorageKeys.accessToken);
    await _storage.delete(key: StorageKeys.refreshToken);
  }

  Future<bool> get hasSession async => (await refreshToken) != null;
}
