import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/features/wallet/data/wallet_repository.dart';

/// Answers with what the test sets, and keeps the requests it saw.
class _Adapter implements HttpClientAdapter {
  _Adapter(this.reply);

  final ResponseBody Function(RequestOptions options) reply;
  final List<RequestOptions> seen = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    seen.add(options);
    return reply(options);
  }

  @override
  void close({bool force = false}) {}
}

WalletRepository _repository(_Adapter adapter) =>
    WalletRepository(Dio(BaseOptions(baseUrl: 'https://example.test'))..httpClientAdapter = adapter);

ResponseBody _file(String body, {String? disposition, bool truncated = false, int status = 200}) =>
    ResponseBody.fromBytes(
      utf8.encode(body),
      status,
      headers: {
        'content-type': ['text/csv; charset=utf-8'],
        'content-disposition': ?(disposition == null ? null : [disposition]),
        'x-export-truncated': [truncated ? 'true' : 'false'],
      },
    );

void main() {
  group('exportTransactions', () {
    test('returns the file, the name the server gave it, and whether it was cut', () async {
      final adapter = _Adapter(
        (_) => _file('a,b\r\n', disposition: 'attachment; filename="wallet-statement-2026-09-21.csv"', truncated: true),
      );

      final result = await _repository(adapter).exportTransactions();

      final statement = result.valueOrNull!;
      expect(utf8.decode(statement.bytes), 'a,b\r\n');
      expect(statement.filename, 'wallet-statement-2026-09-21.csv');
      expect(statement.truncated, isTrue);
    });

    test('asks for raw bytes, so a file with any characters arrives whole', () async {
      final adapter = _Adapter((_) => _file('x'));

      await _repository(adapter).exportTransactions();

      expect(adapter.seen.single.responseType, ResponseType.bytes);
      expect(adapter.seen.single.path, '/wallet/transactions/export');
    });

    test('sends the filter, and leaves out what is not set, including an empty search', () async {
      final adapter = _Adapter((_) => _file('x'));

      await _repository(adapter).exportTransactions(type: 'CREDIT', from: '2026-09-01', to: '2026-09-21', search: '');

      expect(adapter.seen.single.queryParameters, {'type': 'CREDIT', 'from': '2026-09-01', 'to': '2026-09-21'});
    });

    test('sends a search when there is one', () async {
      final adapter = _Adapter((_) => _file('x'));

      await _repository(adapter).exportTransactions(search: 'diwali');

      expect(adapter.seen.single.queryParameters, {'search': 'diwali'});
    });

    test('is not marked cut unless the server says so', () async {
      final result = await _repository(
        _Adapter((_) => _file('x', disposition: 'attachment; filename="a.csv"')),
      ).exportTransactions();

      expect(result.valueOrNull!.truncated, isFalse);
    });

    test('uses a plain name when the server sent none', () async {
      final result = await _repository(_Adapter((_) => _file('x'))).exportTransactions();

      expect(result.valueOrNull!.filename, 'wallet-statement.csv');
    });

    test('never uses a name that could point the file somewhere else', () async {
      for (final disposition in [
        'attachment; filename="../../evil.csv"',
        'attachment; filename="a/b.csv"',
        r'attachment; filename="..\evil.csv"',
        'attachment; filename="a b.csv"',
        'attachment; filename=""',
      ]) {
        final result = await _repository(_Adapter((_) => _file('x', disposition: disposition))).exportTransactions();

        expect(result.valueOrNull!.filename, 'wallet-statement.csv', reason: disposition);
      }
    });

    test('gives the server’s own message when it refuses, even though the reply is raw bytes', () async {
      final adapter = _Adapter(
        (_) => _file(
          '{"success":false,"code":"BAD_REQUEST","message":"Choose a period of at most 366 days"}',
          status: 400,
        ),
      );

      final failure = (await _repository(adapter).exportTransactions()).failureOrNull;

      expect(failure, isA<ValidationFailure>());
      expect(failure!.message, 'Choose a period of at most 366 days');
    });

    test('gives a plain message when the reply is not readable at all', () async {
      final adapter = _Adapter((_) => _file('<html>Bad gateway</html>', status: 502));

      final failure = (await _repository(adapter).exportTransactions()).failureOrNull;

      expect(failure, isNotNull);
      expect(failure!.message, isNotEmpty);
    });
  });

  group('getTransactions', () {
    ResponseBody empty() => ResponseBody.fromString(
      '{"success":true,"data":{"data":[],"total":0,"page":1,"limit":20}}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );

    test('sends the kind, the dates and the search with the page', () async {
      final adapter = _Adapter((_) => empty());

      await _repository(
        adapter,
      ).getTransactions(page: 2, limit: 20, type: 'BONUS', from: '2026-09-01', to: '2026-09-21', search: 'diwali');

      expect(adapter.seen.single.queryParameters, {
        'page': 2,
        'limit': 20,
        'type': 'BONUS',
        'from': '2026-09-01',
        'to': '2026-09-21',
        'search': 'diwali',
      });
    });

    test('sends only the page when nothing else is asked, and drops an empty search', () async {
      final adapter = _Adapter((_) => empty());

      await _repository(adapter).getTransactions(search: '');

      expect(adapter.seen.single.queryParameters, {'page': 1, 'limit': 20});
    });
  });
}
