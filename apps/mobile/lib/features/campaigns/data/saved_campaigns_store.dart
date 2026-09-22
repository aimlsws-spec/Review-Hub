import 'package:hive_flutter/hive_flutter.dart';

import '../../../core/constants/storage_keys.dart';

/// The campaigns a person saved for later, kept on this phone.
///
/// They are not sent anywhere: saving is a private bookmark, not something the server or anyone else needs to know.
/// Only the ids are kept; the campaigns themselves are fetched when the saved list opens, so a campaign that has since
/// ended is not shown from an old copy.
class SavedCampaignsStore {
  SavedCampaignsStore(this._box);

  /// A short list on purpose: the saved view fetches each one, so it must stay quick to open.
  static const maxSaved = 30;

  final Box _box;

  /// Newest first.
  List<String> get ids {
    final raw = _box.get(StorageKeys.savedCampaignIds);
    return raw is List
        ? [
            for (final id in raw)
              if (id is String && id.isNotEmpty) id,
          ]
        : const [];
  }

  Future<void> write(List<String> ids) => _box.put(StorageKeys.savedCampaignIds, ids);
}
