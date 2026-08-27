import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/withdrawal_model.dart';
import '../../providers/wallet_providers.dart';

class WithdrawalHistoryScreen extends ConsumerWidget {
  const WithdrawalHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final withdrawalsAsync = ref.watch(withdrawalsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Withdrawals')),
      body: withdrawalsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(withdrawalsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(withdrawalsProvider)),
          success: (page) {
            if (page.items.isEmpty) {
              return const EmptyState(icon: Icons.arrow_upward_rounded, title: 'No withdrawal requests yet');
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(withdrawalsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: page.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) => _WithdrawalTile(withdrawal: page.items[index]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _WithdrawalTile extends StatelessWidget {
  const _WithdrawalTile({required this.withdrawal});

  final WithdrawalModel withdrawal;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('₹${withdrawal.finalAmountValue.toStringAsFixed(2)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                AppBadge.forStatus(withdrawal.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('d MMM yyyy, h:mm a').format(withdrawal.createdAt),
              style: const TextStyle(fontSize: 11.5, color: AppColors.slate400),
            ),
            if (withdrawal.rejectionReason != null) ...[
              const SizedBox(height: 6),
              Text(withdrawal.rejectionReason!, style: const TextStyle(fontSize: 12.5, color: AppColors.danger)),
            ],
          ],
        ),
      ),
    );
  }
}
