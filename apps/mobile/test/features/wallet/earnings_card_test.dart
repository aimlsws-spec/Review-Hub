import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/wallet/data/models/earnings_model.dart';
import 'package:viral_kar/features/wallet/data/wallet_repository.dart';
import 'package:viral_kar/features/wallet/presentation/widgets/earnings_card.dart';
import 'package:viral_kar/features/wallet/providers/wallet_providers.dart';

/// Serves the earnings the test sets, and records which chart periods were asked for.
class _FakeWalletRepository extends Fake implements WalletRepository {
  Result<EarningsBreakdownModel> earnings = const Result.success(
    EarningsBreakdownModel(tasks: 120, bonus: 15, referral: 50, total: 185),
  );
  Map<EarningsPeriod, Result<EarningsChartModel>> charts = {
    EarningsPeriod.week: const Result.success(
      EarningsChartModel(
        points: [
          EarningsPointModel(key: '2026-10-02', amount: 40),
          EarningsPointModel(key: '2026-10-03', amount: 10),
        ],
        total: 50,
      ),
    ),
    EarningsPeriod.month: const Result.success(
      EarningsChartModel(
        period: EarningsPeriod.month,
        points: [
          EarningsPointModel(key: '2026-09'),
          EarningsPointModel(key: '2026-10'),
        ],
      ),
    ),
  };
  final List<EarningsPeriod> asked = [];

  @override
  Future<Result<EarningsBreakdownModel>> getEarnings() async => earnings;

  @override
  Future<Result<EarningsChartModel>> getEarningsChart(EarningsPeriod period) async {
    asked.add(period);
    return charts[period]!;
  }
}

Future<_FakeWalletRepository> _pump(WidgetTester tester, [_FakeWalletRepository? fake]) async {
  final repository = fake ?? _FakeWalletRepository();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [walletRepositoryProvider.overrideWithValue(repository)],
      child: const MaterialApp(
        home: Scaffold(body: SingleChildScrollView(child: EarningsCard())),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return repository;
}

void main() {
  testWidgets('shows earnings split into tasks, bonus and referral', (tester) async {
    await _pump(tester);

    expect(find.text('₹120'), findsOneWidget);
    expect(find.text('₹15'), findsOneWidget);
    expect(find.text('₹50'), findsOneWidget);
  });

  testWidgets('starts on the last 7 days and switches to the last 6 months', (tester) async {
    final repository = await _pump(tester);

    expect(find.byType(BarChart), findsOneWidget);
    expect(repository.asked, [EarningsPeriod.week]);

    await tester.tap(find.text('Last 6 months'));
    await tester.pumpAndSettle();

    expect(repository.asked.last, EarningsPeriod.month);
    // Every month of that chart is zero, so it says so instead of drawing empty bars.
    expect(find.text('No earnings in the last 6 months yet.'), findsOneWidget);
    expect(find.byType(BarChart), findsNothing);
  });

  testWidgets('says when the chart or the earnings could not be loaded', (tester) async {
    final fake = _FakeWalletRepository()
      ..earnings = const Result.failure(ServerFailure('Earnings are down'))
      ..charts[EarningsPeriod.week] = const Result.failure(NetworkFailure('No connection'));
    await _pump(tester, fake);

    expect(find.text('Earnings are down'), findsOneWidget);
    expect(find.text('No connection'), findsOneWidget);
  });

  test('labels days by their date and months by their name', () {
    expect(earningsAxisLabel('2026-10-03'), '3');
    expect(earningsAxisLabel('2026-09'), 'Sep');
    expect(earningsAxisLabel('odd'), 'odd');
  });
}
