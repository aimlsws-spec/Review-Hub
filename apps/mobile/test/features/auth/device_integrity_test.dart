import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/network/token_storage.dart';
import 'package:viral_kar/features/auth/data/auth_repository.dart';
import 'package:viral_kar/features/auth/data/device_integrity.dart';

class _FakeTokenStorage extends Fake implements TokenStorage {
  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {}
}

class _FixedChecker implements DeviceIntegrityChecker {
  _FixedChecker(this.integrity);

  final DeviceIntegrity integrity;

  @override
  Future<DeviceIntegrity> check() async => integrity;
}

/// Records the body of every request and answers with a valid session.
class _RecordingAdapter implements HttpClientAdapter {
  final List<Object?> bodies = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<List<int>>? requestStream, Future<void>? cancelFuture) async {
    bodies.add(options.data);
    return ResponseBody.fromString(
      '{"success":true,"data":{"user":{"id":"u1","firstName":"A","lastName":"B","status":"ACTIVE"},'
      '"tokens":{"accessToken":"a","refreshToken":"r","expiresIn":900}}}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PlatformDeviceIntegrityChecker', () {
    const channel = MethodChannel(PlatformDeviceIntegrityChecker.channelName);

    void answerWith(Future<Object?>? Function(MethodCall call) handler) {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, handler);
      addTearDown(
        () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null),
      );
    }

    test('reports what the phone says', () async {
      answerWith((call) async => {'isRooted': true, 'isEmulator': false});

      final result = await PlatformDeviceIntegrityChecker().check();

      expect(result.isRooted, isTrue);
      expect(result.isEmulator, isFalse);
    });

    test('asks the phone the right question', () async {
      final asked = <String>[];
      answerWith((call) async {
        asked.add(call.method);
        return {'isRooted': false, 'isEmulator': true};
      });

      final result = await PlatformDeviceIntegrityChecker().check();

      expect(asked, ['check']);
      expect(result.isEmulator, isTrue);
    });

    test('asks only once, since the phone does not change while the app runs', () async {
      var asked = 0;
      answerWith((call) async {
        asked++;
        return {'isRooted': true, 'isEmulator': true};
      });
      final checker = PlatformDeviceIntegrityChecker();

      await checker.check();
      await checker.check();

      expect(asked, 1);
    });

    test('takes the phone as clean when the native side is missing: no answer must not hold anyone\'s money', () async {
      // No handler set: the channel throws MissingPluginException.
      final result = await PlatformDeviceIntegrityChecker().check();

      expect(result.isRooted, isFalse);
      expect(result.isEmulator, isFalse);
    });

    test('takes the phone as clean when the native side fails', () async {
      answerWith((call) async => throw PlatformException(code: 'boom'));

      final result = await PlatformDeviceIntegrityChecker().check();

      expect(result.isRooted, isFalse);
      expect(result.isEmulator, isFalse);
    });

    test('counts only a real true, never a string, a number or a missing value', () async {
      answerWith((call) async => {'isRooted': 'true', 'isEmulator': 1});

      final result = await PlatformDeviceIntegrityChecker().check();

      expect(result.isRooted, isFalse);
      expect(result.isEmulator, isFalse);
    });

    test('copes with an empty reply', () async {
      answerWith((call) async => null);

      final result = await PlatformDeviceIntegrityChecker().check();

      expect(result.isRooted, isFalse);
    });
  });

  group('sign-in and registration', () {
    late _RecordingAdapter adapter;
    late Dio dio;

    setUp(() {
      adapter = _RecordingAdapter();
      dio = Dio(BaseOptions(baseUrl: 'https://example.test'))..httpClientAdapter = adapter;
    });

    test('login tells the backend what the phone reported, so it can score the device', () async {
      final repository = AuthRepository(
        dio,
        _FakeTokenStorage(),
        _FixedChecker(const DeviceIntegrity(isRooted: true)),
      );

      await repository.login(email: 'a@example.com', password: 'Passw0rd!23');

      expect(adapter.bodies.single, containsPair('isRooted', true));
      expect(adapter.bodies.single, containsPair('isEmulator', false));
    });

    test('registration tells it too', () async {
      final repository = AuthRepository(
        dio,
        _FakeTokenStorage(),
        _FixedChecker(const DeviceIntegrity(isEmulator: true)),
      );

      await repository.register(firstName: 'A', lastName: 'B', email: 'a@example.com', password: 'Passw0rd!23');

      expect(adapter.bodies.single, containsPair('isEmulator', true));
      expect(adapter.bodies.single, containsPair('isRooted', false));
    });

    test('sends false, not nothing, for a clean phone, so an earlier "rooted" report can be cleared', () async {
      final repository = AuthRepository(dio, _FakeTokenStorage(), _FixedChecker(const DeviceIntegrity()));

      await repository.login(email: 'a@example.com', password: 'Passw0rd!23');

      expect(adapter.bodies.single, containsPair('isRooted', false));
      expect(adapter.bodies.single, containsPair('isEmulator', false));
    });

    test('sends no signals at all when there is no checker', () async {
      await AuthRepository(dio, _FakeTokenStorage()).login(email: 'a@example.com', password: 'Passw0rd!23');

      final body = adapter.bodies.single! as Map;
      expect(body.containsKey('isRooted'), isFalse);
      expect(body.containsKey('isEmulator'), isFalse);
    });
  });
}
