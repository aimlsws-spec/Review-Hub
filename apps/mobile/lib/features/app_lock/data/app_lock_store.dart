import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants/storage_keys.dart';

/// Remembers whether the person turned the app lock on. Only that yes-or-no is stored, in the ordinary settings
/// box: it is a preference, not a secret, and the check itself is done by the phone.
class AppLockStore {
  AppLockStore(this._box);

  final Box _box;

  bool get isEnabled => _box.get(StorageKeys.appLockEnabled, defaultValue: false) == true;

  Future<void> setEnabled(bool enabled) => _box.put(StorageKeys.appLockEnabled, enabled);
}
