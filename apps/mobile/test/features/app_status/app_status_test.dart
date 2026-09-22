import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/core/network/app_unavailable_interceptor.dart';
import 'package:viral_kar/core/network/app_version_interceptor.dart';
import 'package:viral_kar/core/network/app_version_source.dart';
import 'package:viral_kar/core/network/retry_interceptor.dart';
import 'package:viral_kar/features/app_status/data/app_config_repository.dart';
import 'package:viral_kar/features/app_status/data/models/app_config_model.dart';
import 'package:viral_kar/features/app_status/presentation/widgets/app_status_gate.dart';
import 'package:viral_kar/features/app_status/providers/app_status_providers.dart';
import 'package:viral_kar/shared/providers/core_providers.dart';

import '../../support/app_lifecycle.dart';

/// Answers the requests a test makes, in order, and records what was asked.
class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.replies);

  final List<ResponseBody Function()> replies;
  final List<RequestOptions> seen = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    seen.add(options);
    final index = seen.length - 1 < replies.length ? seen.length - 1 : replies.length - 1;
    return replies[index]();
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(String body, int status) => ResponseBody.fromString(
  body,
  status,
  headers: {
    Headers.contentTypeHeader: ['application/json'],
  },
);

class _FakeAppConfigRepository extends Fake implements AppConfigRepository {
  final List<Result<AppConfigModel>> replies = [];
  int calls = 0;
  Completer<void>? hold;

  @override
  Future<Result<AppConfigModel>> load() async {
    calls++;
    await hold?.future;
    return replies.isEmpty ? Result.success(_config()) : replies[(calls - 1).clamp(0, replies.length - 1)];
  }
}

AppConfigModel _config({
  bool maintenance = false,
  String message = 'Back soon',
  bool update = false,
  String? url,
  String minimum = '1.4.0',
}) => AppConfigModel(
  maintenanceMode: maintenance,
  maintenanceMessage: message,
  minimumAppVersion: minimum,
  updateRequired: update,
  updateUrl: url,
);

void main() {
  group('AppConfigModel', () {
    test('reads what the server sends', () {
      final config = AppConfigModel.fromJson({
        'maintenanceMode': true,
        'maintenanceMessage': '  Back at 6 PM ',
        'minimumAppVersion': '1.4.0',
        'updateUrl': ' https://play.google.com/store/apps/details?id=x ',
        'updateRequired': true,
      });

      expect(config.maintenanceMode, isTrue);
      expect(config.maintenanceMessage, 'Back at 6 PM');
      expect(config.minimumAppVersion, '1.4.0');
      expect(config.updateUrl, 'https://play.google.com/store/apps/details?id=x');
      expect(config.updateRequired, isTrue);
    });

    test('is open for missing, odd or malformed data: nothing but a clear yes may lock people out', () {
      for (final json in <Map<String, dynamic>>[
        {},
        {'maintenanceMode': 'true', 'updateRequired': 'yes'},
        {'maintenanceMode': 1, 'updateRequired': 1},
        {'maintenanceMode': null, 'updateRequired': null},
      ]) {
        final config = AppConfigModel.fromJson(json);
        expect(config.maintenanceMode, isFalse, reason: '$json');
        expect(config.updateRequired, isFalse, reason: '$json');
        expect(availabilityOf(config), isA<AppOpen>(), reason: '$json');
      }
    });

    test('uses a kind default message, and no update link, when those are empty', () {
      final config = AppConfigModel.fromJson({'maintenanceMode': true, 'maintenanceMessage': '   ', 'updateUrl': ''});

      expect(config.maintenanceMessage, contains('back shortly'));
      expect(config.updateUrl, isNull);
    });

    test('shows maintenance before an update when both apply', () {
      final availability = availabilityOf(_config(maintenance: true, update: true));

      expect(availability, isA<AppInMaintenance>());
    });

    test('asks for an update, with the minimum version and link, when only that applies', () {
      final availability = availabilityOf(_config(update: true, url: 'https://store.example/app'));

      expect(availability, isA<AppNeedsUpdate>());
      expect((availability as AppNeedsUpdate).minimumVersion, '1.4.0');
      expect(availability.updateUrl, 'https://store.example/app');
    });
  });

  group('AppVersionSource and the X-App-Version header', () {
    test('reads the version once and trims it', () async {
      var reads = 0;
      final source = AppVersionSource(
        loader: () async {
          reads++;
          return ' 1.4.2 ';
        },
      );

      expect(await source.value, '1.4.2');
      expect(await source.value, '1.4.2');
      expect(reads, 1);
    });

    test('is empty, not an error, when the version can not be read', () async {
      final source = AppVersionSource(loader: () async => throw StateError('no platform'));

      expect(await source.value, '');
    });

    test('is added to every request', () async {
      final adapter = _ScriptedAdapter([() => _json('{}', 200)]);
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
        ..httpClientAdapter = adapter
        ..interceptors.add(AppVersionInterceptor(AppVersionSource(loader: () async => '1.4.2')));

      await dio.get<dynamic>('/a');
      await dio.get<dynamic>('/b');

      expect(adapter.seen.map((r) => r.headers[AppVersionInterceptor.headerName]), ['1.4.2', '1.4.2']);
    });

    test('is left off, not sent empty, when the version is unknown', () async {
      final adapter = _ScriptedAdapter([() => _json('{}', 200)]);
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
        ..httpClientAdapter = adapter
        ..interceptors.add(AppVersionInterceptor(AppVersionSource(loader: () async => '')));

      await dio.get<dynamic>('/a');

      expect(adapter.seen.single.headers.containsKey(AppVersionInterceptor.headerName), isFalse);
    });
  });

  group('AppUnavailableInterceptor', () {
    Dio dioFor(_ScriptedAdapter adapter, void Function() onUnavailable) =>
        Dio(BaseOptions(baseUrl: 'https://example.test'))
          ..httpClientAdapter = adapter
          ..interceptors.add(AppUnavailableInterceptor(onUnavailable));

    test('signals when the platform is in maintenance, and still gives the caller the error', () async {
      var signals = 0;
      final dio = dioFor(
        _ScriptedAdapter([() => _json('{"success":false,"code":"MAINTENANCE_MODE","message":"Back soon"}', 503)]),
        () => signals++,
      );

      await expectLater(
        dio.get<dynamic>('/wallet'),
        throwsA(isA<DioException>().having((e) => e.response?.statusCode, 'status', 503)),
      );

      expect(signals, 1);
    });

    test('signals when the app is too old', () async {
      var signals = 0;
      final dio = dioFor(
        _ScriptedAdapter([() => _json('{"success":false,"code":"APP_UPDATE_REQUIRED","message":"Update"}', 426)]),
        () => signals++,
      );

      await expectLater(dio.get<dynamic>('/wallet'), throwsA(isA<DioException>()));

      expect(signals, 1);
    });

    test('does not put the app behind a maintenance page for a server that simply failed', () async {
      var signals = 0;
      for (final reply in [
        () => _json('{"success":false,"code":"INTERNAL_SERVER_ERROR"}', 500),
        () => _json('{"success":false,"code":"SERVICE_UNAVAILABLE"}', 503),
        () => _json('<html>Bad gateway</html>', 502),
        () => _json('{"success":false,"code":"UNAUTHORIZED"}', 401),
      ]) {
        final dio = dioFor(_ScriptedAdapter([reply]), () => signals++);
        await expectLater(dio.get<dynamic>('/wallet'), throwsA(isA<DioException>()));
      }

      expect(signals, 0);
    });
  });

  group('RetryInterceptor and maintenance', () {
    test('does not retry a request the platform turned away for maintenance', () async {
      final adapter = _ScriptedAdapter([() => _json('{"success":false,"code":"MAINTENANCE_MODE"}', 503)]);
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio, delays: const [Duration.zero, Duration.zero]));

      await expectLater(dio.get<dynamic>('/wallet'), throwsA(isA<DioException>()));

      expect(adapter.seen, hasLength(1));
    });

    test('still retries an ordinary server error', () async {
      final adapter = _ScriptedAdapter([() => _json('{"success":false,"code":"INTERNAL_SERVER_ERROR"}', 500)]);
      final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))..httpClientAdapter = adapter;
      dio.interceptors.add(RetryInterceptor(dio, delays: const [Duration.zero, Duration.zero]));

      await expectLater(dio.get<dynamic>('/wallet'), throwsA(isA<DioException>()));

      expect(adapter.seen, hasLength(3));
    });
  });

  group('AppStatusGate', () {
    late _FakeAppConfigRepository repository;
    late List<Uri> opened;
    var openResult = true;

    setUp(() {
      repository = _FakeAppConfigRepository();
      opened = [];
      openResult = true;
    });

    Future<ProviderContainer> open(WidgetTester tester) async {
      final container = ProviderContainer(
        overrides: [
          appConfigRepositoryProvider.overrideWithValue(repository),
          urlOpenerProvider.overrideWithValue((uri) async {
            opened.add(uri);
            return openResult;
          }),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: AppStatusGate(child: Scaffold(body: Text('The app'))),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return container;
    }

    testWidgets('shows the app when the platform is open', (tester) async {
      await open(tester);

      expect(find.text('The app'), findsOneWidget);
      expect(find.text('We will be right back'), findsNothing);
    });

    testWidgets('shows the maintenance page with the admin’s message, and keeps the app underneath', (tester) async {
      repository.replies.add(Result.success(_config(maintenance: true, message: 'Back at 6 PM tonight')));

      await open(tester);

      expect(find.text('We will be right back'), findsOneWidget);
      expect(find.text('Back at 6 PM tonight'), findsOneWidget);
      expect(find.text('The app'), findsNothing);
      expect(find.text('The app', skipOffstage: false), findsOneWidget);
    });

    testWidgets('lets the person try again, and returns to the app when maintenance is over', (tester) async {
      repository.replies
        ..add(Result.success(_config(maintenance: true)))
        ..add(Result.success(_config()));
      await open(tester);

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(repository.calls, 2);
      expect(find.text('The app'), findsOneWidget);
      expect(find.text('We will be right back'), findsNothing);
    });

    testWidgets('asks an old app to update, and opens the store link', (tester) async {
      repository.replies.add(
        Result.success(_config(update: true, url: 'https://play.google.com/store/apps/details?id=x', minimum: '1.4.0')),
      );
      await open(tester);

      expect(find.text('Please update the app'), findsOneWidget);
      expect(find.textContaining('1.4.0'), findsOneWidget);

      await tester.tap(find.text('Update now'));
      await tester.pumpAndSettle();

      expect(opened, [Uri.parse('https://play.google.com/store/apps/details?id=x')]);
    });

    testWidgets('says so when the store could not be opened', (tester) async {
      openResult = false;
      repository.replies.add(
        Result.success(_config(update: true, url: 'https://play.google.com/store/apps/details?id=x')),
      );
      await open(tester);

      await tester.tap(find.text('Update now'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Could not open the store'), findsOneWidget);
    });

    testWidgets('offers only to check again when there is no update link', (tester) async {
      repository.replies.add(Result.success(_config(update: true)));
      await open(tester);

      expect(find.text('Update now'), findsNothing);
      expect(find.text('Check again'), findsOneWidget);
    });

    testWidgets('keeps showing maintenance when the next check fails: no answer is not "it is back"', (tester) async {
      repository.replies
        ..add(Result.success(_config(maintenance: true)))
        ..add(const Result.failure(NetworkFailure()));
      await open(tester);

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(find.text('We will be right back'), findsOneWidget);
    });

    testWidgets('carries on as normal when the very first check fails: a connection problem is not maintenance', (
      tester,
    ) async {
      repository.replies.add(const Result.failure(NetworkFailure()));

      await open(tester);

      expect(find.text('The app'), findsOneWidget);
    });

    testWidgets('looks again when a request is turned away, and once for a burst of them', (tester) async {
      final container = await open(tester);
      expect(repository.calls, 1);
      repository.replies
        ..clear()
        ..add(Result.success(_config(maintenance: true)));
      repository.hold = Completer<void>();

      container.read(appUnavailableSignalProvider.notifier).state++;
      container.read(appUnavailableSignalProvider.notifier).state++;
      container.read(appUnavailableSignalProvider.notifier).state++;
      await tester.pump();
      repository.hold!.complete();
      await tester.pumpAndSettle();

      expect(repository.calls, 2);
      expect(find.text('We will be right back'), findsOneWidget);
    });

    testWidgets('looks again when the app comes back to the front', (tester) async {
      await open(tester);
      repository.replies
        ..clear()
        ..add(Result.success(_config(maintenance: true)));

      leaveApp(tester);
      returnToApp(tester);
      await tester.pumpAndSettle();

      expect(repository.calls, 2);
      expect(find.text('We will be right back'), findsOneWidget);
    });
  });
}
