import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

class WithdrawScreen extends ConsumerStatefulWidget {
  const WithdrawScreen({super.key});

  @override
  ConsumerState<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends ConsumerState<WithdrawScreen> {
  final _amountController = TextEditingController();
  String? _selectedBankAccountId;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _submit(double availableBalance) async {
    final amount = double.tryParse(_amountController.text.trim());

    if (amount == null || amount < _minWithdrawalAmount) {
      setState(() => _errorMessage = 'Minimum withdrawal amount is ₹$_minWithdrawalAmount.');
      return;
    }
    if (amount > availableBalance) {
      setState(() => _errorMessage = 'You only have ₹${availableBalance.toStringAsFixed(2)} available.');
      return;
    }
    if (_selectedBankAccountId == null) {
      setState(() => _errorMessage = 'Select a bank account.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await ref.read(walletRepositoryProvider).requestWithdrawal(
          amount: amount,
          bankAccountId: _selectedBankAccountId!,
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Could not submit the withdrawal request.');
      return;
    }

    ref.read(walletRefreshProvider.notifier).state++;
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Withdrawal requested — we\'ll process it shortly.')),
    );
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final walletAsync = ref.watch(walletSummaryProvider);
    final accountsAsync = ref.watch(bankAccountsProvider);

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
                    if (_errorMessage != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                        child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
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
                          _selectedBankAccountId ??= accounts.firstWhere(
                            (a) => a.isPrimary,
                            orElse: () => accounts.first,
                          ).id;
                          return Column(
                            children: accounts
                                .map((a) => _BankAccountOption(
                                      account: a,
                                      selected: _selectedBankAccountId == a.id,
                                      onTap: () => setState(() => _selectedBankAccountId = a.id),
                                    ))
                                .toList(),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                    LoadingButton(label: 'Request withdrawal', isLoading: _isSubmitting, onPressed: () => _submit(available)),
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
