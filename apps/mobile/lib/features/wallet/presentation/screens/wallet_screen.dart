import 'package:flutter/foundation.dart';
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
            const SizedBox(height: 20),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Users earn and withdraw rather than top up, so this test-only action never ships.
                // The backend also answers 404 unless its mock payment gateway is active.
                if (kDebugMode) ...[
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.add_circle_outline_rounded,
                      label: 'Add Funds',
                      onTap: () async {
                        // Trigger mock add funds
                        final success = await ref.read(simulateAddFundsProvider.notifier).addFunds(500);
                        if (context.mounted && success) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Simulated adding ₹500 to wallet.')),
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: _ActionButton(
                    icon: Icons.arrow_upward_rounded,
                    label: 'Withdraw',
                    onTap: () => context.push(RoutePaths.withdraw),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _ActionButton(
                    icon: Icons.account_balance_rounded,
                    label: 'Banks',
                    onTap: () => context.push(RoutePaths.bankAccounts),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _ActionButton(
                    icon: Icons.receipt_long_rounded,
                    label: 'History',
                    onTap: () => context.push(RoutePaths.withdrawalHistory),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent activity', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
                InkWell(
                  onTap: () => context.push(RoutePaths.walletTransactions),
                  child: const Row(
                    children: [
                      Text('See all', style: TextStyle(color: AppColors.primary600, fontSize: 13, fontWeight: FontWeight.w600)),
                      Icon(Icons.chevron_right_rounded, color: AppColors.primary600, size: 16),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            transactionsAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
              error: (error, stack) => Text('$error'),
              data: (result) => result.when(
                success: (page) {
                  if (page.items.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.only(top: 20),
                      child: EmptyState(icon: Icons.receipt_long_outlined, title: 'No transactions yet'),
                    );
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
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.navy900, Color(0xFF193255), Color(0xFFE56A00), AppColors.orange500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          stops: [0.0, 0.45, 0.75, 1.0],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.navy900.withValues(alpha: 0.25), blurRadius: 12, offset: const Offset(0, 6))],
      ),
      child: Stack(
        children: [
          // Subtle background decoration
          Positioned(
            right: -20,
            top: -20,
            child: Icon(Icons.account_balance_wallet_rounded, color: Colors.white.withValues(alpha: 0.05), size: 140),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 16),
                    ),
                    const SizedBox(width: 8),
                    const Text('Available balance', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
                  ],
                ),
                const SizedBox(height: 10),
                Text('₹${available.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _StatChip(label: 'Pending', value: '₹${pending.toStringAsFixed(0)}'),
                      Container(width: 1, height: 24, color: Colors.white.withValues(alpha: 0.2)),
                      _StatChip(label: 'Lifetime earned', value: '₹${lifetime.toStringAsFixed(0)}'),
                    ],
                  ),
                ),
              ],
            ),
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
        Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11, fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
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
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(color: AppColors.primary50, shape: BoxShape.circle),
              child: Icon(icon, size: 20, color: AppColors.primary600),
            ),
            const SizedBox(height: 10),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.navy900, height: 1.2),
            ),
          ],
        ),
      ),
    );
  }
}
