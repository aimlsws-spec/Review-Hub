import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../router/app_router.dart';
import '../router/route_paths.dart';
import 'push_notification_service.dart';

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService();
});

/// Port for syncing a refreshed push token with whoever owns "the signed-in
/// user" — deliberately *not* the auth feature's own provider, so this core
/// module never imports `features/`. The composition root (`main.dart`)
/// overrides this with the real auth-aware implementation; the no-op default
/// below only matters if that override is ever forgotten.
final pushTokenSyncProvider = Provider<Future<void> Function(String token)>((ref) {
  return (token) async {};
});

/// The app's one ScaffoldMessenger, so a notification that arrives while the app is open can be shown on
/// whatever screen is up. `main.dart` hands it to MaterialApp.
final rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Port called when a push arrives while the app is open, so the composition root can refresh what depends on
/// notifications (the unread badge) without this core module importing a feature. No-op by default.
final pushReceivedHookProvider = Provider<void Function()>((ref) {
  return () {};
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
    service.onForegroundMessage.listen(_showInApp);

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
    await _ref.read(pushTokenSyncProvider)(token);
  }

  void _navigateTo(RemoteMessage message) {
    _ref.read(routerProvider).go(routeForNotificationType(message.data['type'] as String?));
  }

  /// Android shows nothing for a push that arrives while the app is open, so it is shown as a banner with a
  /// shortcut to where a tap on the real notification would have gone.
  void _showInApp(RemoteMessage message) {
    _ref.read(pushReceivedHookProvider)();
    final notification = message.notification;
    final messenger = rootScaffoldMessengerKey.currentState;
    if (notification == null || messenger == null) return;

    final title = notification.title ?? '';
    final body = notification.body ?? '';
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 5),
        content: Text(title.isEmpty ? body : body.isEmpty ? title : '$title\n$body'),
        action: SnackBarAction(label: 'View', onPressed: () => _navigateTo(message)),
      ),
    );
  }
}
