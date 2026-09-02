import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:logger/logger.dart';

import '../../firebase_options.dart';

/// Background messages arrive with no app UI running, so FCM requires this to
/// be a top-level (or static) function it can invoke on its own. There's
/// nothing to do here today beyond letting the OS show the notification tray
/// entry — kept as a named handler so `onBackgroundMessage` has somewhere to
/// route to, and so silent background data processing has a home if it's
/// ever needed.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

/// Wraps Firebase Cloud Messaging. Mirrors the backend's PushService: without
/// a real Firebase project configured (see lib/firebase_options.dart), every
/// method here fails safely and [isEnabled] stays false — a missing push
/// feature must never crash the app.
class PushNotificationService {
  final _logger = Logger(printer: PrettyPrinter(methodCount: 0));
  bool _initialized = false;
  bool isEnabled = false;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      isEnabled = true;
    } catch (error) {
      _logger.w('Firebase not configured — push notifications disabled: $error');
      isEnabled = false;
    }
  }

  Future<String?> requestPermissionAndGetToken() async {
    if (!isEnabled) return null;
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        _logger.i('Push notification permission denied by user');
        return null;
      }
      return await FirebaseMessaging.instance.getToken();
    } catch (error) {
      _logger.w('Failed to obtain FCM token: $error');
      return null;
    }
  }

  /// Fires whenever FCM rotates the device token — the backend's copy must be
  /// re-registered or it'll keep sending push to a dead token.
  Stream<String> get onTokenRefresh => isEnabled ? FirebaseMessaging.instance.onTokenRefresh : const Stream.empty();

  /// Fires when the user taps a notification while the app is running (foreground or background).
  Stream<RemoteMessage> get onNotificationTap =>
      isEnabled ? FirebaseMessaging.onMessageOpenedApp : const Stream.empty();

  /// The notification that launched the app from fully terminated, if any —
  /// `onMessageOpenedApp` doesn't fire for this case, it has to be polled once at startup.
  Future<RemoteMessage?> getInitialMessage() async {
    if (!isEnabled) return null;
    try {
      return await FirebaseMessaging.instance.getInitialMessage();
    } catch (error) {
      _logger.w('Failed to read initial push message: $error');
      return null;
    }
  }
}
