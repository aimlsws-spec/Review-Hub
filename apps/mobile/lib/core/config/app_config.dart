import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// Build-time configuration, overridable via `--dart-define` at build/run time,
/// e.g. `flutter run --dart-define=API_BASE_URL=https://api.viralkar.com/api/v1`.
class AppConfig {
  AppConfig._();

  static const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');

  /// `10.0.2.2` is the special alias only an Android *emulator* uses to reach
  /// the host machine's `localhost` — it resolves to nothing on web, iOS
  /// simulators, or desktop, where `localhost` itself is correct. `kIsWeb` is
  /// checked first since `dart:io`'s `Platform` throws on web if touched at all.
  static String get apiBaseUrl {
    if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
    if (kIsWeb) return 'http://localhost:3000/api/v1';
    if (Platform.isAndroid) return 'http://10.0.2.2:3000/api/v1';
    return 'http://localhost:3000/api/v1';
  }

  static const bool enableLogging = bool.fromEnvironment(
    'ENABLE_LOGGING',
    defaultValue: true,
  );

  /// From Google Cloud Console, against this app's package name + release SHA fingerprint.
  /// Empty until that's set up — see auth.controller.ts's `/auth/google/mobile`.
  static const String googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  /// Apple's Sign In only works directly on Apple platforms; Android and web need a Service ID
  /// and a hosted redirect endpoint, neither of which exist here yet.
  static const String appleServiceId = String.fromEnvironment('APPLE_SERVICE_ID');
  static const String appleRedirectUri = String.fromEnvironment('APPLE_REDIRECT_URI');

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
