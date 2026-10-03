import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants/storage_keys.dart';

/// This phone's copy of each person's saved campaigns.
///
/// The server holds the real list (see `SavedCampaignsRepository`); this copy lets the bookmark show at once, and the
/// saved view open without a connection. It is kept per person, so someone else signing in on the same phone does not
/// see another person's list. Only the ids are kept; the campaigns themselves are fetched when the saved view opens,
/// so a campaign that has since ended is not shown from an old copy.
class SavedCampaignsStore {
  SavedCampaignsStore(this._box);

  /// A short list on purpose: the saved view fetches each one, so it must stay quick to open. The server has the same
  /// limit.
  static const maxSaved = 30;

  final Box _box;

  /// Newest first.
  List<String> idsFor(String userId) => _read('${StorageKeys.savedCampaignIds}:$userId');

  Future<void> writeFor(String userId, List<String> ids) => _box.put('${StorageKeys.savedCampaignIds}:$userId', ids);

  /// What the phone saved before saving moved to the server, under one key for whoever used the phone. Uploaded once,
  /// for the first person to sign in afterwards, then cleared.
  List<String> get legacyIds => _read(StorageKeys.savedCampaignIds);

  Future<void> clearLegacy() => _box.delete(StorageKeys.savedCampaignIds);

  List<String> _read(String key) {
    final raw = _box.get(key);
    return raw is List
        ? [
            for (final id in raw)
              if (id is String && id.isNotEmpty) id,
          ]
        : const [];
  }
}
