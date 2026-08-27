import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/notification_preference_model.dart';
import '../data/settings_repository.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(dioProvider));
});

final notificationPreferencesProvider =
    FutureProvider.autoDispose<Result<NotificationPreferenceModel>>((ref) async {
  return ref.watch(settingsRepositoryProvider).getNotificationPreferences();
});
