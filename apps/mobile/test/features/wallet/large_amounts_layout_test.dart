import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/features/campaigns/providers/campaign_providers.dart';
import 'package:viral_kar/features/dashboard/presentation/screens/home_screen.dart';
import 'package:viral_kar/features/gamification/providers/gamification_providers.dart';
import 'package:viral_kar/features/notifications/providers/notification_providers.dart';
import 'package:viral_kar/features/tasks/providers/task_providers.dart';
import 'package:viral_kar/features/wallet/data/models/earnings_model.dart';
import 'package:viral_kar/features/wallet/data/models/wallet_summary_model.dart';
import 'package:viral_kar/features/wallet/data/models/wallet_transaction_model.dart';
import 'package:viral_kar/features/wallet/data/models/withdrawal_model.dart';
import 'package:viral_kar/features/wallet/data/wallet_repository.dart';
import 'package:viral_kar/features/wallet/presentation/screens/wallet_screen.dart';
import 'package:viral_kar/features/wallet/presentation/screens/withdrawal_history_screen.dart';
import 'package:viral_kar/features/wallet/providers/wallet_providers.dart';
import 'package:viral_kar/shared/models/api_response.dart';

import '../../support/router_harness.dart';

/// Nine figures with paise: far more than anyone will hold, so if this fits, every real balance does.
const _huge = '98765432.10';

/// Serves a wallet holding [_huge] in every figure.
class _RichWalletRepository extends Fake implements WalletRepository {
  @override
  Future<Result<WalletSummaryModel>> getWallet() async => const Result.success(
    WalletSummaryModel(
      id: 'wallet-1',
      availableBalance: _huge,
      pendingBalance: _huge,
      lockedBalance: _huge,
      lifetimeEarnings: _huge,
      todayEarnings: _huge,
    ),
  );

  @override
  Future<Result<EarningsBreakdownModel>> getEarnings() async =>
      const Result.success(
        EarningsBreakdownModel(
          tasks: 98765432,
          bonus: 98765432,
          referral: 98765432,
          total: 98765432,
        ),
      );

  @override
  Future<Result<EarningsChartModel>> getEarningsChart(
    EarningsPeriod period,
  ) async => const Result.success(
    EarningsChartModel(
      points: [EarningsPointModel(key: '2026-10-07', amount: 98765432)],
      total: 98765432,
    ),
  );

  @override
  Future<Result<PaginatedResponse<WalletTransactionModel>>> getTransactions({
    int page = 1,
    int limit = 20,
    String? type,
    String? from,
    String? to,
    String? search,
  }) async => Result.success(
    PaginatedResponse(
      items: [
        WalletTransactionModel(
          id: 'tx-1',
          type: 'CREDIT',
          status: 'COMPLETED',
          amount: _huge,
          balanceBefore: '0',
          balanceAfter: _huge,
          createdAt: DateTime(2026, 10, 7),
        ),
      ],
      total: 1,
      page: 1,
      limit: 20,
    ),
  );

  @override
  Future<Result<PaginatedResponse<WithdrawalModel>>> getWithdrawals({
    int page = 1,
    int limit = 20,
  }) async => Result.success(
    PaginatedResponse(
      items: [
        WithdrawalModel(
          id: 'wd-1',
          amount: _huge,
          processingFee: '0',
          finalAmount: _huge,
          status: 'UNDER_REVIEW',
          createdAt: DateTime(2026, 10, 7),
        ),
      ],
      total: 1,
      page: 1,
      limit: 20,
    ),
  );
}

class _SignedIn extends AuthStateNotifier {
  @override
  Future<UserModel?> build() async => const UserModel(
    id: 'user-1',
    firstName: 'Bhumika',
    lastName: 'Tirgar',
    email: 'b@example.com',
    status: 'ACTIVE',
  );
}

/// The smallest common Android phone width, where an amount runs out of room first.
Future<void> _pumpOnSmallPhone(WidgetTester tester, Widget screen) async {
  tester.view.physicalSize = const Size(320 * 3, 690 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  const unavailable = Result<Never>.failure(ServerFailure('Not in this test'));
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        walletRepositoryProvider.overrideWithValue(_RichWalletRepository()),
        authStateProvider.overrideWith(_SignedIn.new),
        // The home screen's other sections are not about money; they just show their error state here.
        campaignsProvider.overrideWith((ref, sort) async => unavailable),
        gamificationProfileProvider.overrideWith((ref) async => unavailable),
        mySubmissionsProvider.overrideWith((ref) async => unavailable),
        recommendedTasksProvider.overrideWith((ref) async => unavailable),
        unreadCountProvider.overrideWith(
          (ref) async => const Result.success(0),
        ),
      ],
      child: MaterialApp.router(routerConfig: routerFor(screen)),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  // A layout that runs out of room makes Flutter report an overflow, which fails the test by itself; each test also
  // checks the amount is really on screen, so a figure cannot pass by simply not being drawn.
  testWidgets(
    'home: the wallet card and stats fit a huge balance on a small phone',
    (tester) async {
      await _pumpOnSmallPhone(tester, const HomeScreen());

      expect(find.text('₹$_huge'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'wallet: the balance and its pending / lifetime figures fit on a small phone',
    (tester) async {
      await _pumpOnSmallPhone(tester, const WalletScreen());

      expect(find.text('₹$_huge'), findsOneWidget);
      expect(find.text('₹98765432'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'withdrawal history: a huge amount sits beside its status on a small phone',
    (tester) async {
      await _pumpOnSmallPhone(tester, const WithdrawalHistoryScreen());

      expect(find.text('₹$_huge'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
