import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/bank_account_model.dart';
import '../data/models/reward_model.dart';
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
