import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/bank_account_model.dart';
import '../../providers/wallet_providers.dart';

class BankAccountsScreen extends ConsumerWidget {
  const BankAccountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accountsAsync = ref.watch(bankAccountsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bank accounts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add bank account',
            onPressed: () => context.push(RoutePaths.addBankAccount),
          ),
        ],
      ),
      body: accountsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(bankAccountsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(bankAccountsProvider)),
          success: (accounts) {
            if (accounts.isEmpty) {
              return EmptyState(
                icon: Icons.account_balance_outlined,
                title: 'No bank accounts yet',
                description: 'Add a bank account to withdraw your earnings.',
                action: ElevatedButton(
                  onPressed: () => context.push(RoutePaths.addBankAccount),
                  child: const Text('Add bank account'),
                ),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: accounts.length,
              itemBuilder: (context, index) => _BankAccountTile(account: accounts[index]),
            );
          },
        ),
      ),
    );
  }
}

class _BankAccountTile extends StatelessWidget {
  const _BankAccountTile({required this.account});

  final BankAccountModel account;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(color: AppColors.primary50, shape: BoxShape.circle),
          child: const Icon(Icons.account_balance_rounded, color: AppColors.primary600, size: 20),
        ),
        title: Text(account.bankName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text('${account.accountHolderName} · ${account.maskedAccountNumber}', style: const TextStyle(fontSize: 12.5)),
        trailing: account.isPrimary
            ? const Chip(
                label: Text('Primary', style: TextStyle(fontSize: 11)),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
                backgroundColor: AppColors.primary50,
              )
            : (account.isVerified
                ? const Icon(Icons.verified_rounded, color: AppColors.success, size: 20)
                : const Icon(Icons.hourglass_empty_rounded, color: AppColors.slate300, size: 20)),
      ),
    );
  }
}
