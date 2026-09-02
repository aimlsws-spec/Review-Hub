// PLACEHOLDER — this file is not connected to a real Firebase project.
//
// Once you have one, run from apps/mobile:
//   dart pub global activate flutterfire_cli
//   flutterfire configure
// and let it overwrite this file. Nothing else in the app needs to change —
// PushNotificationService already reads DefaultFirebaseOptions.currentPlatform
// and simply stays disabled (logs a warning, no crash) until these are real,
// the same way the backend's PushService degrades without FIREBASE_* env vars.
//
// ignore_for_file: type=lint

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError('Web push is not configured — VIRAL KAR mobile targets Android and iOS.');
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for $defaultTargetPlatform — '
          'push notifications are only wired for Android and iOS.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'PLACEHOLDER_API_KEY',
    appId: 'PLACEHOLDER_APP_ID',
    messagingSenderId: 'PLACEHOLDER_SENDER_ID',
    projectId: 'PLACEHOLDER_PROJECT_ID',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'PLACEHOLDER_API_KEY',
    appId: 'PLACEHOLDER_APP_ID',
    messagingSenderId: 'PLACEHOLDER_SENDER_ID',
    projectId: 'PLACEHOLDER_PROJECT_ID',
    iosBundleId: 'com.viralkar.viralKar',
  );
}
