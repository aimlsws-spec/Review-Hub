import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/constants/storage_keys.dart';
import 'package:viral_kar/core/network/app_version_source.dart';
import 'package:viral_kar/core/network/device_id_interceptor.dart';
import 'package:viral_kar/core/network/device_id_storage.dart';
import 'package:viral_kar/core/network/token_storage.dart';
import 'package:viral_kar/core/network/dio_client.dart';

/// Keystore stand-in that keeps values in a map, and can be made to fail.
class _MemoryStorage extends FlutterSecureStorage {
  _MemoryStorage({this.failReads = false, this.failWrites = false});

  final Map<String, String> values = {};
  final bool failReads;
  final bool failWrites;
  int reads = 0;

  @override
  Future<String?> read({
    required String key,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    reads++;
    if (failReads) throw StateError('keystore unavailable');
    return values[key];
  }

  @override
  Future<void> write({
    required String key,
    required String? value,
    AppleOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (failWrites) throw StateError('keystore unavailable');
    if (value == null) {
      values.remove(key);
    } else {
      values[key] = value;
    }
  }
}

void main() {
  group('DeviceIdStorage', () {
    test('makes an id the backend will accept, and saves it', () async {
      final keystore = _MemoryStorage();
      final id = await DeviceIdStorage(keystore).value;

      expect(DeviceIdStorage.isValid(id), isTrue);
      expect(id, hasLength(32));
      expect(keystore.values[StorageKeys.deviceId], id);
    });

    test('gives the same id on the next launch', () async {
      final keystore = _MemoryStorage();
      final first = await DeviceIdStorage(keystore).value;
      final afterRestart = await DeviceIdStorage(keystore).value;

      expect(afterRestart, first);
    });

    test('gives two installs different ids', () async {
      final one = await DeviceIdStorage(_MemoryStorage()).value;
      final two = await DeviceIdStorage(_MemoryStorage()).value;

      expect(one, isNot(two));
    });

    test('is deterministic for a seeded generator, so the format is not left to chance', () async {
      final id = await DeviceIdStorage(_MemoryStorage(), random: Random(1)).value;
      final again = await DeviceIdStorage(_MemoryStorage(), random: Random(1)).value;

      expect(id, again);
      expect(RegExp(r'^[0-9a-f]{32}$').hasMatch(id), isTrue);
    });

    test('creates one id when several requests ask at once', () async {
      final keystore = _MemoryStorage();
      final storage = DeviceIdStorage(keystore);

      final ids = await Future.wait([storage.value, storage.value, storage.value]);

      expect(ids.toSet(), hasLength(1));
      expect(keystore.reads, 1);
    });

    test('replaces a saved value the backend would refuse', () async {
      final keystore = _MemoryStorage()..values[StorageKeys.deviceId] = 'short';
      final id = await DeviceIdStorage(keystore).value;

      expect(id, isNot('short'));
      expect(DeviceIdStorage.isValid(id), isTrue);
      expect(keystore.values[StorageKeys.deviceId], id);
    });

    test('still works when the keystore cannot be read: the app keeps talking to the server', () async {
      final storage = DeviceIdStorage(_MemoryStorage(failReads: true));

      final id = await storage.value;

      expect(DeviceIdStorage.isValid(id), isTrue);
      expect(await storage.value, id);
    });

    test('still works when the keystore cannot be written', () async {
      final storage = DeviceIdStorage(_MemoryStorage(failWrites: true));

      expect(DeviceIdStorage.isValid(await storage.value), isTrue);
    });

    test('accepts what the backend accepts and nothing else', () {
      expect(DeviceIdStorage.isValid('abcdefgh'), isTrue);
      expect(DeviceIdStorage.isValid('a.b_c:d-e1'), isTrue);
      expect(DeviceIdStorage.isValid('a' * 128), isTrue);
      expect(DeviceIdStorage.isValid('a' * 129), isFalse);
      expect(DeviceIdStorage.isValid('short'), isFalse);
      expect(DeviceIdStorage.isValid('has space in it'), isFalse);
    });
  });

  group('the X-Device-ID header', () {
    Future<RequestOptions> sent(Dio dio, String path) async {
      RequestOptions? seen;
      dio.httpClientAdapter = _RecordingAdapter((options) => seen = options);
      await dio.get<dynamic>(path);
      return seen!;
    }

    test('is on every request the interceptor sees', () async {
      final storage = DeviceIdStorage(_MemoryStorage());
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))..interceptors.add(DeviceIdInterceptor(storage));

      final first = await sent(dio, '/a');
      final second = await sent(dio, '/b');

      expect(first.headers[DeviceIdInterceptor.headerName], await storage.value);
      expect(second.headers[DeviceIdInterceptor.headerName], first.headers[DeviceIdInterceptor.headerName]);
    });

    test('is on the main client, including calls that skip the auth interceptor', () async {
      final keystore = _MemoryStorage();
      final dio = DioClientFactory.create(
        tokenStorage: TokenStorage(keystore),
        deviceIdStorage: DeviceIdStorage(keystore),
        appVersionSource: AppVersionSource(loader: () async => '1.4.2'),
      );

      final login = await sent(dio, '/auth/login');

      expect(login.headers[DeviceIdInterceptor.headerName], keystore.values[StorageKeys.deviceId]);
      expect(login.headers['Authorization'], isNull);
    });
  });
}

/// Answers every request with an empty 200 and hands the request to [onRequest].
class _RecordingAdapter implements HttpClientAdapter {
  _RecordingAdapter(this.onRequest);

  final void Function(RequestOptions options) onRequest;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    onRequest(options);
    return ResponseBody.fromString(
      '{}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
