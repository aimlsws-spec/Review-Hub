import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/bank_account_model.dart';
import '../data/models/reward_model.dart';
import '../data/models/transaction_history.dart';
import '../data/models/wallet_summary_model.dart';
import '../data/models/wallet_transaction_model.dart';
import '../data/models/withdrawal_model.dart';
import '../data/wallet_repository.dart';

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  return WalletRepository(ref.watch(dioProvider));
});

/// Bumped after a successful withdrawal or bank account change so dependent
/// providers refetch.
final walletRefreshProvider = StateProvider<int>((ref) => 0);

final walletSummaryProvider = FutureProvider.autoDispose<Result<WalletSummaryModel>>((ref) async {
  ref.watch(walletRefreshProvider);
  return ref.watch(walletRepositoryProvider).getWallet();
});

final walletTransactionsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<WalletTransactionModel>>>((ref) async {
  ref.watch(walletRefreshProvider);
  return ref.watch(walletRepositoryProvider).getTransactions();
});

final myRewardsProvider = FutureProvider.autoDispose<Result<PaginatedResponse<RewardModel>>>((ref) async {
  return ref.watch(walletRepositoryProvider).getRewards();
});

final bankAccountsProvider = FutureProvider.autoDispose<Result<List<BankAccountModel>>>((ref) async {
  ref.watch(walletRefreshProvider);
  return ref.watch(walletRepositoryProvider).getBankAccounts();
});

final withdrawalsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<WithdrawalModel>>>((ref) async {
  ref.watch(walletRefreshProvider);
  return ref.watch(walletRepositoryProvider).getWithdrawals();
});

// --- The Transactions screen: filter, search, paging, statement -----------------------------------------------------

/// What the person has asked the history to show. Scoped to the screen, so it starts fresh each time.
final transactionHistoryFilterProvider =
    NotifierProvider.autoDispose<TransactionHistoryFilterNotifier, TransactionHistoryFilter>(
      TransactionHistoryFilterNotifier.new,
    );

class TransactionHistoryFilterNotifier extends Notifier<TransactionHistoryFilter> {
  @override
  TransactionHistoryFilter build() => const TransactionHistoryFilter();

  /// Null shows every kind.
  void setKind(TransactionKind? kind) => state = kind == null ? state.copyWith(clearKind: true) : state.copyWith(kind: kind);

  void setPeriod(TransactionPeriod period) => state = state.copyWith(period: period);

  void setCustomRange(DayRange range) => state = state.copyWith(period: TransactionPeriod.custom, customRange: range);

  void setSearch(String search) => state = state.copyWith(search: search.trim());

  void clear() => state = const TransactionHistoryFilter();
}

/// The search box's text, kept with the screen so the screen needs no state of its own.
final transactionSearchControllerProvider = Provider.autoDispose<TextEditingController>((ref) {
  final controller = TextEditingController(text: ref.read(transactionHistoryFilterProvider).search);
  ref.onDispose(controller.dispose);
  return controller;
});

/// Today, for counting back "last 7 days". A provider so a test can fix it.
final transactionClockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// What has been loaded so far: the pages fetched, how many there are in all, and whether more are on their way.
class TransactionListState {
  const TransactionListState({
    required this.items,
    required this.total,
    required this.page,
    this.loadingMore = false,
    this.loadMoreMessage,
  });

  final List<WalletTransactionModel> items;
  final int total;
  final int page;
  final bool loadingMore;

  /// Why the last "load more" failed. What is already shown is kept.
  final String? loadMoreMessage;

  bool get hasMore => items.length < total;

  TransactionListState copyWith({
    List<WalletTransactionModel>? items,
    int? total,
    int? page,
    bool? loadingMore,
    String? loadMoreMessage,
    bool clearMessage = false,
  }) {
    return TransactionListState(
      items: items ?? this.items,
      total: total ?? this.total,
      page: page ?? this.page,
      loadingMore: loadingMore ?? this.loadingMore,
      loadMoreMessage: clearMessage ? null : (loadMoreMessage ?? this.loadMoreMessage),
    );
  }
}

/// The history, a page at a time, under the current filter. Changing the filter starts again from the first page.
final transactionHistoryProvider =
    AsyncNotifierProvider.autoDispose<TransactionHistoryNotifier, Result<TransactionListState>>(
      TransactionHistoryNotifier.new,
    );

class TransactionHistoryNotifier extends AsyncNotifier<Result<TransactionListState>> {
  static const pageSize = 20;

  @override
  Future<Result<TransactionListState>> build() async {
    ref.watch(walletRefreshProvider);
    final filter = ref.watch(transactionHistoryFilterProvider);
    final result = await _fetch(filter, page: 1);
    return result.map((page) => TransactionListState(items: page.items, total: page.total, page: 1));
  }

  Future<Result<PaginatedResponse<WalletTransactionModel>>> _fetch(TransactionHistoryFilter filter, {required int page}) {
    final dates = filter.dates(ref.read(transactionClockProvider)());
    return ref
        .read(walletRepositoryProvider)
        .getTransactions(
          page: page,
          limit: pageSize,
          type: filter.kind?.apiValue,
          from: dates.from,
          to: dates.to,
          search: filter.search,
        );
  }

  /// Fetches the next page and adds it below. Does nothing when everything is loaded or a page is already coming.
  Future<void> loadMore() async {
    final current = state.value?.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final filter = ref.read(transactionHistoryFilterProvider);
    state = AsyncData(Result.success(current.copyWith(loadingMore: true, clearMessage: true)));
    final result = await _fetch(filter, page: current.page + 1);
    if (!ref.mounted) return;

    // If the filter changed while the page was coming, the list has already started over; this page belongs to the
    // old one and must not be added to the new one.
    final latest = state.value?.valueOrNull;
    if (latest == null || !latest.loadingMore || ref.read(transactionHistoryFilterProvider) != filter) return;

    result.when(
      success: (page) {
        final known = {for (final item in latest.items) item.id};
        state = AsyncData(
          Result.success(
            latest.copyWith(
              items: [
                ...latest.items,
                for (final item in page.items)
                  if (known.add(item.id)) item,
              ],
              total: page.total,
              page: current.page + 1,
              loadingMore: false,
            ),
          ),
        );
      },
      failure: (failure) {
        state = AsyncData(
          Result.success(
            latest.copyWith(
              loadingMore: false,
              loadMoreMessage: failure.message.isEmpty ? 'Could not load more. Please try again.' : failure.message,
            ),
          ),
        );
      },
    );
  }
}

/// Hands a file to another app through the phone's share sheet. A provider so a test can stand in for it.
final shareFileProvider = Provider<Future<void> Function(Uint8List bytes, String filename)>((ref) {
  return (bytes, filename) => SharePlus.instance.share(
    ShareParams(
      files: [XFile.fromData(bytes, mimeType: 'text/csv', name: filename)],
      fileNameOverrides: [filename],
      subject: 'Wallet statement',
    ),
  );
});

/// How a statement download ended, for the message the person sees.
class StatementOutcome {
  const StatementOutcome({this.error, this.truncated = false});

  /// Set when it failed. Null means the statement was handed to the share sheet.
  final String? error;

  /// The statement is only the newest part of a longer history.
  final bool truncated;
}

/// Downloads the history under the current filter, and offers it to the person's other apps as a file.
final statementExportProvider = NotifierProvider.autoDispose<StatementExportNotifier, bool>(StatementExportNotifier.new);

/// State: whether a download is running, so the button can show it and can not be pressed twice.
class StatementExportNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  Future<StatementOutcome> download() async {
    if (state) return const StatementOutcome(error: 'A download is already running.');
    state = true;
    try {
      final filter = ref.read(transactionHistoryFilterProvider);
      final dates = filter.dates(ref.read(transactionClockProvider)());
      final result = await ref
          .read(walletRepositoryProvider)
          .exportTransactions(type: filter.kind?.apiValue, from: dates.from, to: dates.to, search: filter.search);
      return await result.when(
        success: (statement) async {
          try {
            await ref.read(shareFileProvider)(statement.bytes, statement.filename);
            return StatementOutcome(truncated: statement.truncated);
          } catch (_) {
            return const StatementOutcome(error: 'Could not open sharing on this phone.');
          }
        },
        failure: (failure) async => StatementOutcome(
          error: failure.message.isEmpty ? 'Could not download the statement. Please try again.' : failure.message,
        ),
      );
    } finally {
      if (ref.mounted) state = false;
    }
  }
}

final simulateAddFundsProvider =AsyncNotifierProvider.autoDispose<_SimulateAddFundsNotifier, void>(_SimulateAddFundsNotifier.new);

class _SimulateAddFundsNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> addFunds(double amount) async {
    state = const AsyncLoading();
    final result = await ref.read(walletRepositoryProvider).simulateAddFunds(amount);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Failed to add funds', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    ref.read(walletRefreshProvider.notifier).state++;
    return true;
  }
}
