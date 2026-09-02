import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_providers.dart';
import '../router/app_router.dart';
import '../router/route_paths.dart';
import 'push_notification_service.dart';

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService();
});

final pushNotificationControllerProvider = Provider<PushNotificationController>((ref) {
  return PushNotificationController(ref);
});

/// Maps a dispatched notification's `type` (mirrors the backend's
/// NotificationType enum) to where tapping it should open. Anything without a
/// more specific destination falls back to the notifications list rather than
/// guessing at a screen that doesn't exist yet.
String routeForNotificationType(String? type) {
  switch (type) {
    case 'REWARD':
      return RoutePaths.wallet;
    case 'WITHDRAWAL':
      return RoutePaths.withdrawalHistory;
    default:
      return RoutePaths.notifications;
  }
}

/// Boots FCM, keeps the backend's copy of this device's push token in sync
/// with whoever is signed in, and routes notification taps. `start()` runs
/// once at app boot (outside the widget tree); [syncForCurrentUser] runs
/// whenever the signed-in user changes.
class PushNotificationController {
  PushNotificationController(this._ref);

  final Ref _ref;

  /// Set if a terminated-state notification tap launched the app. GoRouter
  /// isn't mounted yet at that point, so this is consumed once the first
  /// frame is up — see [consumePendingRoute].
  String? pendingRoute;

  Future<void> start() async {
    final service = _ref.read(pushNotificationServiceProvider);
    await service.initialize();

    service.onTokenRefresh.listen(_syncToken);
    service.onNotificationTap.listen(_navigateTo);

    final initialMessage = await service.getInitialMessage();
    if (initialMessage != null) {
      pendingRoute = routeForNotificationType(initialMessage.data['type'] as String?);
    }
  }

  /// Call after the first frame — navigating before GoRouter is attached to a
  /// Navigator is a no-op, so a cold-start notification tap has to wait for it.
  void consumePendingRoute() {
    final route = pendingRoute;
    if (route == null) return;
    pendingRoute = null;
    _ref.read(routerProvider).go(route);
  }

  /// Requests notification permission and registers the resulting token —
  /// only meaningful once someone is actually signed in, so call this from a
  /// listener on auth state rather than unconditionally at boot.
  Future<void> syncForCurrentUser() async {
    final service = _ref.read(pushNotificationServiceProvider);
    final token = await service.requestPermissionAndGetToken();
    if (token != null) await _syncToken(token);
  }

  Future<void> _syncToken(String token) async {
    final isSignedIn = _ref.read(authStateProvider).value != null;
    if (!isSignedIn) return;
    await _ref.read(authRepositoryProvider).updatePushToken(token);
  }

  void _navigateTo(RemoteMessage message) {
    _ref.read(routerProvider).go(routeForNotificationType(message.data['type'] as String?));
  }
}
