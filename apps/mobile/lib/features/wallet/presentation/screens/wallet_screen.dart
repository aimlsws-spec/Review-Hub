import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/wallet_summary_model.dart';
import '../../providers/wallet_providers.dart';
import '../widgets/transaction_tile.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletSummaryProvider);
    final transactionsAsync = ref.watch(walletTransactionsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: const Text('Wallet')),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(walletRefreshProvider.notifier).state++,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            walletAsync.when(
              loading: () => const SizedBox(height: 140, child: PageLoader()),
              error: (error, stack) => Text('$error'),
              data: (result) => result.when(
                success: (wallet) => _BalanceCard(
                  available: wallet.availableBalanceValue,
                  pending: wallet.pendingBalanceValue,
                  lifetime: wallet.lifetimeEarningsValue,
                ),
                failure: (failure) => Text(failure.message, style: const TextStyle(color: AppColors.danger)),
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 4,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.85,
              children: [
                _ActionButton(
                  icon: Icons.arrow_upward_rounded,
                  label: 'Withdraw',
                  onTap: () => context.push(RoutePaths.withdraw),
                ),
                _ActionButton(
                  icon: Icons.account_balance_rounded,
                  label: 'Bank\naccounts',
                  onTap: () => context.push(RoutePaths.bankAccounts),
                ),
                _ActionButton(
                  icon: Icons.receipt_long_rounded,
                  label: 'Withdrawals',
                  onTap: () => context.push(RoutePaths.withdrawalHistory),
                ),
                _ActionButton(
                  icon: Icons.card_giftcard_rounded,
                  label: 'Rewards',
                  onTap: () => context.push(RoutePaths.walletRewards),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent activity', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                TextButton(
                  onPressed: () => context.push(RoutePaths.walletTransactions),
                  child: const Text('See all'),
                ),
              ],
            ),
            transactionsAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
              error: (error, stack) => Text('$error'),
              data: (result) => result.when(
                success: (page) {
                  if (page.items.isEmpty) {
                    return const EmptyState(icon: Icons.receipt_long_outlined, title: 'No transactions yet');
                  }
                  return Column(
                    children: page.items.take(5).map((t) => TransactionTile(transaction: t)).toList(),
                  );
                },
                failure: (failure) => Text(failure.message, style: const TextStyle(color: AppColors.danger)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.available, required this.pending, required this.lifetime});

  final double available;
  final double pending;
  final double lifetime;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary600, AppColors.primary800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Available balance', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 6),
          Text('₹${available.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatChip(label: 'Pending', value: '₹${pending.toStringAsFixed(0)}'),
              const SizedBox(width: 20),
              _StatChip(label: 'Lifetime earned', value: '₹${lifetime.toStringAsFixed(0)}'),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11.5)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.slate100),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: AppColors.primary600),
            const SizedBox(height: 6),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
