import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/bank_account_model.dart';
import '../../data/models/wallet_summary_model.dart';
import '../../providers/wallet_providers.dart';

/// Mirrors `WALLET_CONSTANTS.MIN_WITHDRAWAL_AMOUNT` on the backend.
const _minWithdrawalAmount = 1000;

/// Null until the user explicitly taps an account; the primary (or first)
/// account is used as the effective default without ever being written back
/// here, so nothing writes to this provider during a widget's own build.
final _selectedBankAccountIdProvider = StateProvider.autoDispose<String?>((ref) => null);

String? _defaultBankAccountId(List<BankAccountModel> accounts) {
  if (accounts.isEmpty) return null;
  return accounts.firstWhere((a) => a.isPrimary, orElse: () => accounts.first).id;
}

final _withdrawSubmitProvider = AsyncNotifierProvider.autoDispose<_WithdrawSubmitNotifier, void>(_WithdrawSubmitNotifier.new);

class _WithdrawSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({required double amount, required double availableBalance, required String? bankAccountId}) async {
    if (amount < _minWithdrawalAmount) {
      state = AsyncError('Minimum withdrawal amount is ₹$_minWithdrawalAmount.', StackTrace.current);
      return false;
    }
    if (amount > availableBalance) {
      state = AsyncError('You only have ₹${availableBalance.toStringAsFixed(2)} available.', StackTrace.current);
      return false;
    }
    if (bankAccountId == null) {
      state = AsyncError('Select a bank account.', StackTrace.current);
      return false;
    }

    state = const AsyncLoading();
    final result = await ref.read(walletRepositoryProvider).requestWithdrawal(amount: amount, bankAccountId: bankAccountId);

    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not submit the withdrawal request.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    ref.read(walletRefreshProvider.notifier).state++;
    return true;
  }
}

class WithdrawScreen extends ConsumerStatefulWidget {
  const WithdrawScreen({super.key});

  @override
  ConsumerState<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends ConsumerState<WithdrawScreen> {
  final _amountController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _submit(double availableBalance, String? effectiveBankAccountId) async {
    final amount = double.tryParse(_amountController.text.trim()) ?? -1;

    final success = await ref.read(_withdrawSubmitProvider.notifier).submit(
          amount: amount,
          availableBalance: availableBalance,
          bankAccountId: effectiveBankAccountId,
        );

    if (!mounted || !success) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Withdrawal requested — we\'ll process it shortly.')),
    );
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final walletAsync = ref.watch(walletSummaryProvider);
    final accountsAsync = ref.watch(bankAccountsProvider);
    final submitState = ref.watch(_withdrawSubmitProvider);
    final selectedBankAccountId = ref.watch(_selectedBankAccountIdProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Withdraw')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: walletAsync.when(
            loading: () => const PageLoader(),
            error: (error, stack) => Text('$error'),
            data: (walletResult) => walletResult.when(
              failure: (failure) => Text(failure.message),
              success: (wallet) {
                final available = wallet.availableBalanceValue;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Available: ₹${available.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 13.5, color: AppColors.slate500),
                    ),
                    const SizedBox(height: 16),
                    if (errorMessage != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
                        child: Text(errorMessage, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Amount',
                        prefixText: '₹ ',
                        helperText: 'Minimum ₹$_minWithdrawalAmount',
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text('Bank account', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    accountsAsync.when(
                      loading: () => const PageLoader(),
                      error: (error, stack) => Text('$error'),
                      data: (accountsResult) => accountsResult.when(
                        failure: (failure) => Text(failure.message),
                        success: (accounts) {
                          if (accounts.isEmpty) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Add a bank account before requesting a withdrawal.', style: TextStyle(color: AppColors.slate500)),
                                const SizedBox(height: 10),
                                OutlinedButton(
                                  onPressed: () => context.push(RoutePaths.addBankAccount),
                                  child: const Text('Add bank account'),
                                ),
                              ],
                            );
                          }
                          final effectiveSelectedId = selectedBankAccountId ?? _defaultBankAccountId(accounts);
                          return Column(
                            children: accounts
                                .map((a) => _BankAccountOption(
                                      account: a,
                                      selected: effectiveSelectedId == a.id,
                                      onTap: () => ref.read(_selectedBankAccountIdProvider.notifier).state = a.id,
                                    ))
                                .toList(),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    LoadingButton(
                      label: 'Request withdrawal',
                      isLoading: submitState.isLoading,
                      onPressed: () => _submit(
                        available,
                        selectedBankAccountId ?? _defaultBankAccountId(accountsAsync.value?.valueOrNull ?? const []),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _BankAccountOption extends StatelessWidget {
  const _BankAccountOption({required this.account, required this.selected, required this.onTap});

  final BankAccountModel account;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? AppColors.primary500 : AppColors.slate100, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: selected ? AppColors.primary600 : AppColors.slate300,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(account.bankName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  Text(account.maskedAccountNumber, style: const TextStyle(fontSize: 12.5, color: AppColors.slate500)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
