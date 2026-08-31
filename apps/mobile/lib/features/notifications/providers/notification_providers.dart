import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/notification_model.dart';
import '../data/notification_repository.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(ref.watch(dioProvider));
});

/// Bumped after marking a notification (or all notifications) read so
/// dependent providers refetch.
final notificationRefreshProvider = StateProvider<int>((ref) => 0);

final notificationsProvider = FutureProvider.autoDispose<Result<PaginatedResponse<NotificationModel>>>((ref) async {
  ref.watch(notificationRefreshProvider);
  return ref.watch(notificationRepositoryProvider).listMine();
});

final unreadCountProvider = FutureProvider.autoDispose<Result<int>>((ref) async {
  ref.watch(notificationRefreshProvider);
  return ref.watch(notificationRepositoryProvider).getUnreadCount();
});
