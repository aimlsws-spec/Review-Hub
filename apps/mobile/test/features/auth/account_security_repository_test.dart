import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/network/token_storage.dart';
import 'package:viral_kar/features/auth/data/auth_repository.dart';
import 'package:viral_kar/features/auth/data/models/login_challenge_model.dart';

class _RecordingTokenStorage extends Fake implements TokenStorage {
  String? savedAccessToken;
  bool cleared = false;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async =>
      savedAccessToken = accessToken;

  @override
  Future<void> clear() async => cleared = true;
}

/// Answers each request with the reply set for its path, and records what was sent.
class _ScriptedAdapter implements HttpClientAdapter {
  final Map<String, (int, Object)> replies = {};
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final (status, body) = replies[options.path] ?? (200, {'success': true, 'data': null});
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

const _session = {
  'user': {'id': 'u1', 'firstName': 'A', 'lastName': 'B', 'status': 'ACTIVE'},
  'tokens': {'accessToken': 'access-1', 'refreshToken': 'refresh-1', 'expiresIn': 900},
};

void main() {
  late _ScriptedAdapter adapter;
  late _RecordingTokenStorage tokens;
  late AuthRepository repository;

  setUp(() {
    adapter = _ScriptedAdapter();
    tokens = _RecordingTokenStorage();
    repository = AuthRepository(Dio()..httpClientAdapter = adapter, tokens);
  });

  group('sign-in from a new device', () {
    test('returns the challenge and saves no tokens when the server asks for a code', () async {
      adapter.replies['/auth/login'] = (
        200,
        {
          'success': true,
          'data': {
            'requiresVerification': true,
            'challengeToken': 'c' * 64,
            'expiresIn': 300,
            'sentTo': ['j****n@example.com'],
          },
        },
      );

      final outcome = (await repository.login(email: 'john@example.com', password: 'Passw0rd!23')).valueOrNull;

      expect(outcome, isA<LoginNeedsDeviceCode>());
      final challenge = (outcome! as LoginNeedsDeviceCode).challenge;
      expect(challenge.challengeToken, 'c' * 64);
      expect(challenge.sentTo, ['j****n@example.com']);
      expect(tokens.savedAccessToken, isNull);
    });

    test('saves the session straight away on a recognised device', () async {
      adapter.replies['/auth/login'] = (200, {'success': true, 'data': _session});

      final outcome = (await repository.login(email: 'john@example.com', password: 'Passw0rd!23')).valueOrNull;

      expect(outcome, isA<LoginSignedIn>());
      expect(tokens.savedAccessToken, 'access-1');
    });

    test('finishes with the code and saves the session', () async {
      adapter.replies['/auth/login/verify-device'] = (200, {'success': true, 'data': _session});

      final result = await repository.verifyNewDevice(challengeToken: 'c' * 64, code: '123456');

      expect(result.isSuccess, isTrue);
      expect(adapter.requests.single.data, {'challengeToken': 'c' * 64, 'code': '123456'});
      expect(tokens.savedAccessToken, 'access-1');
    });

    test('resends for the same challenge', () async {
      await repository.resendNewDeviceCode('c' * 64);

      expect(adapter.requests.single.path, '/auth/login/resend-device-code');
      expect(adapter.requests.single.data, {'challengeToken': 'c' * 64});
    });
  });

  test('sign-up says the policies were accepted', () async {
    adapter.replies['/auth/register'] = (201, {'success': true, 'data': _session});

    await repository.register(
      firstName: 'A',
      lastName: 'B',
      phone: '9876543210',
      password: 'Passw0rd!23',
      acceptPolicies: true,
    );

    expect(adapter.requests.single.data, containsPair('acceptPolicies', true));
  });

  group('phone change', () {
    test('sends the new number with the password and reads where the code went', () async {
      adapter.replies['/auth/phone/change'] = (
        200,
        {
          'success': true,
          'data': {'message': 'sent', 'expiresIn': 300, 'sentTo': '****2233'},
        },
      );

      final result = await repository.requestPhoneChange(newPhone: '9811122233', currentPassword: 'Passw0rd!23');

      expect(result.valueOrNull?.sentTo, '****2233');
      expect(adapter.requests.single.data, {'newPhone': '9811122233', 'currentPassword': 'Passw0rd!23'});
    });

    test('leaves the password out for an account without one', () async {
      adapter.replies['/auth/phone/change'] = (
        200,
        {
          'success': true,
          'data': {'expiresIn': 300, 'sentTo': '****2233'},
        },
      );

      await repository.requestPhoneChange(newPhone: '9811122233');

      expect(adapter.requests.single.data, {'newPhone': '9811122233'});
    });

    test('confirms with the code', () async {
      await repository.verifyPhoneChange('123456');

      expect(adapter.requests.single.path, '/auth/phone/verify');
      expect(adapter.requests.single.data, {'code': '123456'});
    });
  });

  group('deleting the account', () {
    test('sends the password and clears the local session', () async {
      final result = await repository.deleteAccount(currentPassword: 'Passw0rd!23');

      expect(result.isSuccess, isTrue);
      expect(adapter.requests.single.method, 'DELETE');
      expect(adapter.requests.single.path, '/auth/account');
      expect(adapter.requests.single.data, {'currentPassword': 'Passw0rd!23'});
      expect(tokens.cleared, isTrue);
    });

    test('keeps the session and passes on the reason when the server refuses', () async {
      adapter.replies['/auth/account'] = (400, {'success': false, 'message': 'Your wallet still has money in it.'});

      final result = await repository.deleteAccount(currentPassword: 'Passw0rd!23');

      expect(result.failureOrNull, isA<ValidationFailure>());
      expect(result.failureOrNull?.message, 'Your wallet still has money in it.');
      expect(tokens.cleared, isFalse);
    });
  });
}
