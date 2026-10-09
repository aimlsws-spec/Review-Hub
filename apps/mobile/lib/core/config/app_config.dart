import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// The app's settings, read from `apps/mobile/.env` (bundled into the app and loaded in `main()` before anything
/// else), so a plain `flutter run` uses them. Copy `.env.example` to `.env` to start.
///
/// Each setting is looked up in this order:
/// 1. `--dart-define` at build/run time, e.g. `--dart-define=API_BASE_URL=https://api.viralkar.com/api/v1`. Wins over
///    the file, so a release build can be pointed at production without editing `.env`.
/// 2. `.env`.
/// 3. The default below.
///
/// Everything in a mobile app can be read by anyone who downloads it, so `.env` holds public values only: addresses
/// and client IDs, never a secret key. Secrets stay in the backend's `.env`.
class AppConfig {
  AppConfig._();

  static const String _apiBaseUrlDefine = String.fromEnvironment('API_BASE_URL');
  static const String _enableLoggingDefine = String.fromEnvironment('ENABLE_LOGGING');
  static const String _googleServerClientIdDefine = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
  static const String _appleServiceIdDefine = String.fromEnvironment('APPLE_SERVICE_ID');
  static const String _appleRedirectUriDefine = String.fromEnvironment('APPLE_REDIRECT_URI');

  /// A setting from `--dart-define`, then `.env`; null when neither has it. Before `.env` is loaded (in tests, or if
  /// the file is missing) only `--dart-define` counts.
  static String? _setting(String name, String define) {
    if (define.isNotEmpty) return define;
    if (!dotenv.isInitialized) return null;
    final value = dotenv.maybeGet(name)?.trim();
    return value == null || value.isEmpty ? null : value;
  }

  /// `10.0.2.2` is the special alias only an Android *emulator* uses to reach
  /// the host machine's `localhost` — it resolves to nothing on web, iOS
  /// simulators, or desktop, where `localhost` itself is correct. `kIsWeb` is
  /// checked first since `dart:io`'s `Platform` throws on web if touched at all.
  static String get apiBaseUrl {
    final configured = _setting('API_BASE_URL', _apiBaseUrlDefine);
    if (configured != null) return configured;
    if (kIsWeb) return 'http://localhost:3000/api/v1';
    if (Platform.isAndroid) return 'http://10.0.2.2:3000/api/v1';
    return 'http://localhost:3000/api/v1';
  }

  /// On unless set to `false`.
  static bool get enableLogging => _setting('ENABLE_LOGGING', _enableLoggingDefine)?.toLowerCase() != 'false';

  /// The *Web* OAuth client ID from Google Cloud Console (project "Viralkar"). It must be the same
  /// value as the backend's GOOGLE_CLIENT_ID, because the backend checks that every ID token was issued
  /// for this audience (see auth.controller.ts's `/auth/google/mobile`). Client IDs are public
  /// identifiers, not secrets, so a default is safe here; set GOOGLE_SERVER_CLIENT_ID for another Google project.
  static String get googleServerClientId =>
      _setting('GOOGLE_SERVER_CLIENT_ID', _googleServerClientIdDefine) ??
      '403662087440-jr70qsh92l0cicmfipdqpfvpmn76vgds.apps.googleusercontent.com';

  /// Apple's Sign In only works directly on Apple platforms; Android and web need a Service ID
  /// and a hosted redirect endpoint, neither of which exist here yet.
  static String get appleServiceId => _setting('APPLE_SERVICE_ID', _appleServiceIdDefine) ?? '';
  static String get appleRedirectUri => _setting('APPLE_REDIRECT_URI', _appleRedirectUriDefine) ?? '';

  /// Apple sign-in is out of scope for now (it needs a paid Apple Developer membership), so the
  /// button is only offered where it can actually work: natively on Apple platforms, or elsewhere
  /// once a Service ID has been configured.
  static bool get isAppleSignInAvailable {
    if (appleServiceId.isNotEmpty) return true;
    if (kIsWeb) return false;
    return Platform.isIOS || Platform.isMacOS;
  }

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  /// Uploaded/generated files (avatars, AI story images, campaign media) come back from the API
  /// as a path relative to the server root, e.g. `/stories/<uuid>.jpg` — never a full URL. They're
  /// served at the root (`ServeStaticModule` in app.module.ts), not under [apiBaseUrl]'s `/api/v1`
  /// prefix, so that prefix has to be stripped before appending the path, not just prepended to it.
  static String resolveUploadUrl(String relativePath) {
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return relativePath;
    final uri = Uri.parse(apiBaseUrl);
    final origin = '${uri.scheme}://${uri.authority}';
    final path = relativePath.startsWith('/') ? relativePath : '/$relativePath';
    return '$origin/uploads$path';
  }
}
