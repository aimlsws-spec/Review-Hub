import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/config/app_config.dart';

void main() {
  tearDown(dotenv.clean);

  group('settings from .env', () {
    test('uses the API address and other values in the file', () {
      dotenv.loadFromString(
        envString: [
          'API_BASE_URL=http://localhost:3000/api/v1',
          'ENABLE_LOGGING=false',
          'GOOGLE_SERVER_CLIENT_ID=another-project.apps.googleusercontent.com',
          'APPLE_SERVICE_ID=in.viralkar.signin',
        ].join('\n'),
      );

      expect(AppConfig.apiBaseUrl, 'http://localhost:3000/api/v1');
      expect(AppConfig.enableLogging, isFalse);
      expect(AppConfig.googleServerClientId, 'another-project.apps.googleusercontent.com');
      expect(AppConfig.appleServiceId, 'in.viralkar.signin');
      expect(AppConfig.isAppleSignInAvailable, isTrue);
    });

    test('builds addresses of uploaded files on the configured server', () {
      dotenv.loadFromString(envString: 'API_BASE_URL=https://api.viralkar.com/api/v1');

      expect(AppConfig.resolveUploadUrl('/campaign/3f2a.jpg'), 'https://api.viralkar.com/uploads/campaign/3f2a.jpg');
    });

    test('falls back to the defaults for values left empty', () {
      dotenv.loadFromString(envString: 'API_BASE_URL=\nGOOGLE_SERVER_CLIENT_ID=  \nENABLE_LOGGING=', isOptional: true);

      expect(AppConfig.apiBaseUrl, isNot(isEmpty));
      expect(AppConfig.enableLogging, isTrue);
      expect(AppConfig.googleServerClientId, endsWith('.apps.googleusercontent.com'));
      expect(AppConfig.appleServiceId, isEmpty);
    });
  });

  test('works with no .env loaded at all, using the defaults', () {
    expect(dotenv.isInitialized, isFalse);

    expect(AppConfig.apiBaseUrl, startsWith('http'));
    expect(AppConfig.enableLogging, isTrue);
    expect(AppConfig.googleServerClientId, isNotEmpty);
  });

  test('the example file lists every setting the app reads', () {
    // .env.example is the documentation: a setting the app reads but the example leaves out would be unknown to anyone
    // setting the app up.
    // Tests run from apps/mobile, where the example lives.
    final example = File('.env.example').readAsStringSync();
    for (final name in [
      'API_BASE_URL',
      'ENABLE_LOGGING',
      'GOOGLE_SERVER_CLIENT_ID',
      'APPLE_SERVICE_ID',
      'APPLE_REDIRECT_URI',
    ]) {
      expect(example, contains('$name='), reason: '$name is missing from .env.example');
    }
  });
}
