import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/wallet/data/models/transaction_history.dart';
import 'package:viral_kar/features/wallet/data/models/wallet_transaction_model.dart';
import 'package:viral_kar/features/wallet/data/wallet_repository.dart';
import 'package:viral_kar/features/wallet/presentation/screens/transactions_screen.dart';
import 'package:viral_kar/features/wallet/presentation/widgets/day_range_picker.dart';
import 'package:viral_kar/features/wallet/providers/wallet_providers.dart';
import 'package:viral_kar/shared/models/api_response.dart';

WalletTransactionModel _tx(int n, {String type = 'CREDIT'}) => WalletTransactionModel(
  id: 'tx-$n',
  type: type,
  status: 'SUCCESS',
  amount: '10.00',
  balanceBefore: '0.00',
  balanceAfter: '10.00',
  remarks: 'Note $n',
  createdAt: DateTime(2026, 9, 1).add(Duration(minutes: n)),
);

class _Asked {
  _Asked({required this.page, this.type, this.from, this.to, this.search});

  final int page;
  final String? type;
  final String? from;
  final String? to;
  final String? search;
}

/// Stands in for the server: serves the transactions the test sets, a page at a time, and records what was asked.
class _FakeWalletRepository extends Fake implements WalletRepository {
  List<WalletTransactionModel> all = [for (var i = 1; i <= 3; i++) _tx(i)];
  final List<_Asked> asked = [];
  Failure? failOnPage;
  Completer<void>? hold;

  Result<TransactionExport> exportResult = Result.success(
    TransactionExport(
      bytes: Uint8List.fromList([1, 2, 3]),
      filename: 'wallet-statement-2026-09-21.csv',
      truncated: false,
    ),
  );
  final List<_Asked> exports = [];

  @override
  Future<Result<PaginatedResponse<WalletTransactionModel>>> getTransactions({
    int page = 1,
    int limit = 20,
    String? type,
    String? from,
    String? to,
    String? search,
  }) async {
    asked.add(_Asked(page: page, type: type, from: from, to: to, search: search));
    if (page > 1) await hold?.future;
    if (failOnPage != null && page > 1) return Result.failure(failOnPage!);
    final start = (page - 1) * limit;
    final items = all.skip(start).take(limit).toList();
    return Result.success(PaginatedResponse(items: items, total: all.length, page: page, limit: limit));
  }

  @override
  Future<Result<TransactionExport>> exportTransactions({String? type, String? from, String? to, String? search}) async {
    exports.add(_Asked(page: 0, type: type, from: from, to: to, search: search));
    return exportResult;
  }
}

void main() {
  late _FakeWalletRepository repository;
  late List<({Uint8List bytes, String filename})> shared;
  Object? shareFailure;
  DayRange? pickedRange;

  final today = DateTime(2026, 9, 21, 15, 30);

  setUp(() {
    repository = _FakeWalletRepository();
    shared = [];
    shareFailure = null;
    pickedRange = null;
  });

  ProviderContainer makeContainer() {
    final container = ProviderContainer(
      overrides: [
        walletRepositoryProvider.overrideWithValue(repository),
        transactionClockProvider.overrideWithValue(() => today),
        shareFileProvider.overrideWithValue((bytes, filename) async {
          if (shareFailure != null) throw shareFailure!;
          shared.add((bytes: bytes, filename: filename));
        }),
        dayRangePickerProvider.overrideWithValue((context, current) async => pickedRange),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  /// The screen keeps the history alive while it is showing. A test that waits between steps has to do the same, or the
  /// provider disposes itself while nobody is listening.
  void keepHistoryAlive(ProviderContainer container) {
    container.listen(transactionHistoryProvider, (previous, next) {});
  }

  Future<ProviderContainer> show(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final container = makeContainer();
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: TransactionsScreen()),
      ),
    );
    await tester.pumpAndSettle();
    return container;
  }

  group('the dates a filter asks for', () {
    DateTime day(int y, int m, int d) => DateTime(y, m, d, 23, 59);

    test('no limit for all time, or for a custom period with nothing chosen yet', () {
      expect(const TransactionHistoryFilter().dates(today), (from: null, to: null));
      expect(const TransactionHistoryFilter(period: TransactionPeriod.custom).dates(today), (from: null, to: null));
    });

    test('counts the last 7 days back from today, including today', () {
      const filter = TransactionHistoryFilter(period: TransactionPeriod.last7Days);

      expect(filter.dates(today), (from: '2026-09-15', to: '2026-09-21'));
    });

    test('counts the last 30 days the same way', () {
      const filter = TransactionHistoryFilter(period: TransactionPeriod.last30Days);

      expect(filter.dates(today), (from: '2026-08-23', to: '2026-09-21'));
    });

    test('starts this month on the 1st', () {
      const filter = TransactionHistoryFilter(period: TransactionPeriod.thisMonth);

      expect(filter.dates(today), (from: '2026-09-01', to: '2026-09-21'));
      expect(filter.dates(day(2026, 2, 28)), (from: '2026-02-01', to: '2026-02-28'));
    });

    test('goes back across a month and a year end', () {
      const week = TransactionHistoryFilter(period: TransactionPeriod.last7Days);

      expect(week.dates(day(2026, 3, 5)), (from: '2026-02-27', to: '2026-03-05'));
      expect(week.dates(day(2026, 1, 3)), (from: '2025-12-28', to: '2026-01-03'));
    });

    test('ignores the time of day, so a late night does not change the day asked for', () {
      const filter = TransactionHistoryFilter(period: TransactionPeriod.last7Days);

      expect(filter.dates(DateTime(2026, 9, 21, 0, 1)), filter.dates(DateTime(2026, 9, 21, 23, 59)));
    });

    test('uses the chosen dates for a custom period', () {
      final filter = TransactionHistoryFilter(
        period: TransactionPeriod.custom,
        customRange: DayRange(DateTime(2026, 8, 5), DateTime(2026, 8, 20)),
      );

      expect(filter.dates(today), (from: '2026-08-05', to: '2026-08-20'));
    });

    test('writes a date the way the server reads it, padded', () {
      expect(apiDate(DateTime(2026, 1, 5)), '2026-01-05');
      expect(apiDate(DateTime(987, 12, 31)), '0987-12-31');
    });
  });

  group('TransactionHistoryFilter', () {
    test('kinds are the API’s own transaction types', () {
      expect(TransactionKind.values.map((k) => k.apiValue), [
        'CREDIT',
        'BONUS',
        'REFERRAL',
        'WITHDRAWAL',
        'SPEND',
        'REFUND',
      ]);
    });

    test('is narrowed by a kind, a period or a search', () {
      expect(const TransactionHistoryFilter().isNarrowed, isFalse);
      expect(const TransactionHistoryFilter(kind: TransactionKind.bonus).isNarrowed, isTrue);
      expect(const TransactionHistoryFilter(period: TransactionPeriod.last7Days).isNarrowed, isTrue);
      expect(const TransactionHistoryFilter(search: 'cafe').isNarrowed, isTrue);
    });

    test('compares by what it asks for, so an unchanged filter is not mistaken for a new one', () {
      expect(const TransactionHistoryFilter(search: 'a'), const TransactionHistoryFilter(search: 'a'));
      expect(const TransactionHistoryFilter(search: 'a'), isNot(const TransactionHistoryFilter(search: 'b')));
      expect(DayRange(DateTime(2026), DateTime(2026, 2)), DayRange(DateTime(2026), DateTime(2026, 2)));
    });
  });

  group('the history, page by page', () {
    test('asks for the first page under the filter, twenty at a time', () async {
      final container = makeContainer();
      container.read(transactionHistoryFilterProvider.notifier)
        ..setKind(TransactionKind.withdrawals)
        ..setPeriod(TransactionPeriod.last7Days)
        ..setSearch('  cafe ');

      await container.read(transactionHistoryProvider.future);

      final asked = repository.asked.single;
      expect(
        (asked.page, asked.type, asked.from, asked.to, asked.search),
        (1, 'WITHDRAWAL', '2026-09-15', '2026-09-21', 'cafe'),
      );
    });

    test('adds the next page below what is already there', () async {
      repository.all = [for (var i = 1; i <= 45; i++) _tx(i)];
      final container = makeContainer();
      var history = (await container.read(transactionHistoryProvider.future)).valueOrNull!;
      expect((history.items.length, history.total, history.hasMore), (20, 45, true));

      await container.read(transactionHistoryProvider.notifier).loadMore();
      history = container.read(transactionHistoryProvider).value!.valueOrNull!;
      expect((history.items.length, history.page, history.hasMore), (40, 2, true));

      await container.read(transactionHistoryProvider.notifier).loadMore();
      history = container.read(transactionHistoryProvider).value!.valueOrNull!;
      expect((history.items.length, history.hasMore), (45, false));
      expect(history.items.map((t) => t.id).toSet(), hasLength(45));
    });

    test('does nothing once everything is loaded, and does not ask the server', () async {
      final container = makeContainer();
      await container.read(transactionHistoryProvider.future);

      await container.read(transactionHistoryProvider.notifier).loadMore();

      expect(repository.asked, hasLength(1));
    });

    test('asks for one page at a time, however many times it is nudged', () async {
      repository.all = [for (var i = 1; i <= 45; i++) _tx(i)];
      repository.hold = Completer<void>();
      final container = makeContainer();
      keepHistoryAlive(container);
      await container.read(transactionHistoryProvider.future);

      final notifier = container.read(transactionHistoryProvider.notifier);
      final running = [notifier.loadMore(), notifier.loadMore(), notifier.loadMore()];
      await Future<void>.delayed(Duration.zero);
      repository.hold!.complete();
      await Future.wait(running);

      expect(repository.asked.where((a) => a.page == 2), hasLength(1));
      expect(container.read(transactionHistoryProvider).value!.valueOrNull!.items, hasLength(40));
    });

    test('never shows the same transaction twice, even if the server sends one again', () async {
      repository.all = [for (var i = 1; i <= 25; i++) _tx(i)];
      final container = makeContainer();
      await container.read(transactionHistoryProvider.future);
      // A new transaction arrived while the person was reading, so page 2 starts with one already shown.
      repository.all = [_tx(99), ...repository.all.take(24)];
      // page 2 is now the last six of the shifted list, which include tx-20 that page 1 already had.

      await container.read(transactionHistoryProvider.notifier).loadMore();

      final ids = container.read(transactionHistoryProvider).value!.valueOrNull!.items.map((t) => t.id).toList();
      expect(ids.toSet().length, ids.length);
    });

    test('keeps what is shown, and says why, when the next page can not be loaded', () async {
      repository.all = [for (var i = 1; i <= 45; i++) _tx(i)];
      repository.failOnPage = const NetworkFailure('No internet connection.');
      final container = makeContainer();
      await container.read(transactionHistoryProvider.future);

      await container.read(transactionHistoryProvider.notifier).loadMore();

      final history = container.read(transactionHistoryProvider).value!.valueOrNull!;
      expect(history.items, hasLength(20));
      expect(history.loadMoreMessage, 'No internet connection.');
      expect(history.loadingMore, isFalse);

      repository.failOnPage = null;
      await container.read(transactionHistoryProvider.notifier).loadMore();
      expect(container.read(transactionHistoryProvider).value!.valueOrNull!.items, hasLength(40));
      expect(container.read(transactionHistoryProvider).value!.valueOrNull!.loadMoreMessage, isNull);
    });

    test('drops a page that arrives after the filter changed: it belongs to the old list', () async {
      repository.all = [for (var i = 1; i <= 45; i++) _tx(i)];
      repository.hold = Completer<void>();
      final container = makeContainer();
      keepHistoryAlive(container);
      await container.read(transactionHistoryProvider.future);

      final loading = container.read(transactionHistoryProvider.notifier).loadMore();
      await Future<void>.delayed(Duration.zero);
      container.read(transactionHistoryFilterProvider.notifier).setKind(TransactionKind.bonus);
      repository.hold!.complete();
      await loading;
      await container.read(transactionHistoryProvider.future);

      final history = container.read(transactionHistoryProvider).value!.valueOrNull!;
      expect(history.page, 1);
      expect(history.items, hasLength(20));
    });

    test('starts again from the first page when the filter changes', () async {
      repository.all = [for (var i = 1; i <= 45; i++) _tx(i)];
      final container = makeContainer();
      await container.read(transactionHistoryProvider.future);
      await container.read(transactionHistoryProvider.notifier).loadMore();

      container.read(transactionHistoryFilterProvider.notifier).setSearch('cafe');
      await container.read(transactionHistoryProvider.future);

      expect(repository.asked.last.page, 1);
      expect(repository.asked.last.search, 'cafe');
    });
  });

  group('the statement download', () {
    test('asks for the same filter as the list, and hands the file to the share sheet', () async {
      final container = makeContainer();
      container.read(transactionHistoryFilterProvider.notifier)
        ..setKind(TransactionKind.earnings)
        ..setPeriod(TransactionPeriod.thisMonth);

      final outcome = await container.read(statementExportProvider.notifier).download();

      final asked = repository.exports.single;
      expect((asked.type, asked.from, asked.to), ('CREDIT', '2026-09-01', '2026-09-21'));
      expect(outcome.error, isNull);
      expect(outcome.truncated, isFalse);
      expect(shared.single.filename, 'wallet-statement-2026-09-21.csv');
      expect(shared.single.bytes, [1, 2, 3]);
    });

    test('says when the statement is only the newest part of a longer history', () async {
      repository.exportResult = Result.success(
        TransactionExport(bytes: Uint8List(1), filename: 'a.csv', truncated: true),
      );

      final outcome = await makeContainer().read(statementExportProvider.notifier).download();

      expect(outcome.truncated, isTrue);
      expect(outcome.error, isNull);
      expect(shared, hasLength(1));
    });

    test('gives the server’s reason when it refuses, and shares nothing', () async {
      repository.exportResult = const Result.failure(ValidationFailure('Choose a period of at most 366 days'));

      final outcome = await makeContainer().read(statementExportProvider.notifier).download();

      expect(outcome.error, 'Choose a period of at most 366 days');
      expect(shared, isEmpty);
    });

    test('says so when the phone can not open sharing', () async {
      shareFailure = StateError('no share sheet');

      final outcome = await makeContainer().read(statementExportProvider.notifier).download();

      expect(outcome.error, contains('sharing'));
    });

    test('is not started twice at once, and can be used again afterwards', () async {
      final container = makeContainer();
      final first = container.read(statementExportProvider.notifier).download();
      final second = await container.read(statementExportProvider.notifier).download();

      expect(second.error, contains('already running'));
      await first;
      expect(container.read(statementExportProvider), isFalse);
      expect((await container.read(statementExportProvider.notifier).download()).error, isNull);
      expect(repository.exports, hasLength(2));
    });
  });

  group('the Transactions screen', () {
    Finder chip(String label) => find.widgetWithText(ChoiceChip, label);

    Future<void> tapChip(WidgetTester tester, String label) async {
      await tester.ensureVisible(chip(label));
      await tester.pumpAndSettle();
      await tester.tap(chip(label));
      await tester.pumpAndSettle();
    }

    testWidgets('lists the transactions, and says how many there are at the end', (tester) async {
      await show(tester);

      expect(find.text('Note 1'), findsOneWidget);
      expect(find.text('Note 3'), findsOneWidget);
      expect(find.text('3 transactions'), findsOneWidget);
      expect(repository.asked.single.type, isNull);
    });

    testWidgets('narrows by kind, and back to all', (tester) async {
      await show(tester);

      await tapChip(tester, 'Withdrawals');
      expect(repository.asked.last.type, 'WITHDRAWAL');
      expect(tester.widget<ChoiceChip>(chip('Withdrawals')).selected, isTrue);

      await tapChip(tester, 'All');
      expect(repository.asked.last.type, isNull);
    });

    testWidgets('narrows by a preset period, counted from today', (tester) async {
      await show(tester);

      await tapChip(tester, 'Last 7 days');

      expect((repository.asked.last.from, repository.asked.last.to), ('2026-09-15', '2026-09-21'));
    });

    testWidgets('narrows by the dates the person chooses, and shows them on the chip', (tester) async {
      pickedRange = DayRange(DateTime(2026, 8, 5), DateTime(2026, 8, 20));
      await show(tester);

      await tapChip(tester, 'Choose dates');

      expect((repository.asked.last.from, repository.asked.last.to), ('2026-08-05', '2026-08-20'));
      expect(find.text('2026-08-05 to 2026-08-20'), findsOneWidget);
    });

    testWidgets('keeps the filter as it was when the person closes the calendar without choosing', (tester) async {
      pickedRange = null;
      await show(tester);
      final before = repository.asked.length;

      await tapChip(tester, 'Choose dates');

      expect(repository.asked.length, before);
    });

    testWidgets('tells the person a period of more than a year is too long, and does not apply it', (tester) async {
      pickedRange = DayRange(DateTime(2024, 1, 1), DateTime(2026, 1, 1));
      await show(tester);
      final before = repository.asked.length;

      await tapChip(tester, 'Choose dates');

      expect(find.text('Choose a period of up to a year.'), findsOneWidget);
      expect(repository.asked.length, before);
    });

    testWidgets('searches the notes, and clears the search with one tap', (tester) async {
      await show(tester);

      await tester.enterText(find.byType(TextField), '  diwali ');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(repository.asked.last.search, 'diwali');

      await tester.tap(find.byTooltip('Clear search'));
      await tester.pumpAndSettle();
      // The real repository leaves an empty search out of the request altogether.
      expect(repository.asked.last.search ?? '', isEmpty);
      expect(find.byTooltip('Clear search'), findsNothing);
    });

    testWidgets('combines the kind, the dates and the search', (tester) async {
      await show(tester);
      await tapChip(tester, 'Bonus');
      await tapChip(tester, 'This month');
      await tester.enterText(find.byType(TextField), 'diwali');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      final last = repository.asked.last;
      expect((last.type, last.from, last.to, last.search), ('BONUS', '2026-09-01', '2026-09-21', 'diwali'));
    });

    testWidgets('says nothing matched, and clears every filter in one tap', (tester) async {
      repository.all = [];
      await show(tester);
      expect(find.text('No transactions yet'), findsOneWidget);

      await tapChip(tester, 'Bonus');
      expect(find.text('No transactions match'), findsOneWidget);

      await tester.tap(find.text('Clear filters'));
      await tester.pumpAndSettle();

      expect(repository.asked.last.type, isNull);
      expect(find.text('No transactions yet'), findsOneWidget);
    });

    testWidgets('loads more from the button, and the count at the end updates', (tester) async {
      repository.all = [for (var i = 1; i <= 25; i++) _tx(i)];
      await show(tester);
      expect(find.text('Load more'), findsOneWidget);

      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();

      expect(repository.asked.last.page, 2);
      expect(find.text('Load more'), findsNothing);
      expect(find.text('25 transactions'), findsOneWidget);
    });

    testWidgets('loads more by itself when the person scrolls to the end', (tester) async {
      repository.all = [for (var i = 1; i <= 25; i++) _tx(i)];
      await show(tester);
      expect(repository.asked.where((a) => a.page == 2), isEmpty);

      await tester.drag(find.byType(ListView).last, const Offset(0, -6000));
      await tester.pumpAndSettle();

      expect(repository.asked.where((a) => a.page == 2), hasLength(1));
    });

    testWidgets('shows why more could not be loaded, and lets the person try again', (tester) async {
      repository.all = [for (var i = 1; i <= 25; i++) _tx(i)];
      repository.failOnPage = const NetworkFailure('No internet connection.');
      await show(tester);

      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      expect(find.text('No internet connection.'), findsOneWidget);
      expect(find.text('Note 1'), findsOneWidget);

      repository.failOnPage = null;
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      expect(find.text('25 transactions'), findsOneWidget);
    });

    testWidgets('downloads the statement with the button, under the current filter', (tester) async {
      await show(tester);
      await tapChip(tester, 'Earnings');

      await tester.tap(find.byTooltip('Download statement'));
      await tester.pumpAndSettle();

      expect(repository.exports.single.type, 'CREDIT');
      expect(shared, hasLength(1));
      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('says when the statement is only the newest 5,000', (tester) async {
      repository.exportResult = Result.success(
        TransactionExport(bytes: Uint8List(1), filename: 'a.csv', truncated: true),
      );
      await show(tester);

      await tester.tap(find.byTooltip('Download statement'));
      await tester.pumpAndSettle();

      expect(find.textContaining('newest 5,000'), findsOneWidget);
    });

    testWidgets('shows the reason when the statement could not be made', (tester) async {
      repository.exportResult = const Result.failure(NetworkFailure('No internet connection.'));
      await show(tester);

      await tester.tap(find.byTooltip('Download statement'));
      await tester.pumpAndSettle();

      expect(find.text('No internet connection.'), findsOneWidget);
    });

    testWidgets('offers to try again when the history could not be loaded', (tester) async {
      repository.all = [];
      final container = await show(tester);
      expect(find.text('No transactions yet'), findsOneWidget);
      repository.all = [_tx(1)];

      container.invalidate(transactionHistoryProvider);
      await tester.pumpAndSettle();

      expect(find.text('Note 1'), findsOneWidget);
    });
  });
}
