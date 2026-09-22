import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/storage_keys.dart';

/// The app's stable install id, sent to the backend as `X-Device-ID`.
///
/// It is a random value made on first use and kept in the platform keystore, so
/// it is the same on every launch of this install and different on every other
/// install. The backend hashes it before storing it and uses it to notice one
/// device holding several accounts. It says nothing about the phone or its
/// owner, so it is not a hardware id and needs no permission.
class DeviceIdStorage {
  DeviceIdStorage(this._storage, {Random? random}) : _random = random ?? Random.secure();

  final FlutterSecureStorage _storage;
  final Random _random;

  Future<String>? _pending;

  /// Same id on every call. The first call reads or creates it; calls made while
  /// that is still running share the result, so two requests starting together
  /// can never create two different ids.
  Future<String> get value => _pending ??= _load();

  Future<String> _load() async {
    try {
      final saved = await _storage.read(key: StorageKeys.deviceId);
      if (saved != null && isValid(saved)) return saved;
    } catch (_) {
      // An unreadable keystore must not stop the app talking to the server.
      // A fresh id below is still consistent for this run.
    }

    final created = _generate();
    try {
      await _storage.write(key: StorageKeys.deviceId, value: created);
    } catch (_) {
      // Kept in memory for this run only; the next launch tries to save again.
    }
    return created;
  }

  /// 32 random hex characters, which satisfies the backend's 8 to 128 character
  /// `[A-Za-z0-9._:-]` rule for an install id.
  String _generate() {
    final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
    return bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  }

  static final RegExp _allowed = RegExp(r'^[A-Za-z0-9._:-]{8,128}$');

  /// Whether a stored value is still something the backend will accept.
  static bool isValid(String id) => _allowed.hasMatch(id);
}
