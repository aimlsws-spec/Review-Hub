import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/reward_model.dart';
import '../../providers/wallet_providers.dart';

class RewardsScreen extends ConsumerWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rewardsAsync = ref.watch(myRewardsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Rewards')),
      body: rewardsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(myRewardsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(myRewardsProvider)),
          success: (page) {
            if (page.items.isEmpty) {
              return const EmptyState(icon: Icons.card_giftcard_rounded, title: 'No rewards yet');
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(myRewardsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: page.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) => _RewardTile(reward: page.items[index]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _RewardTile extends StatelessWidget {
  const _RewardTile({required this.reward});

  final RewardModel reward;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
              child: const Icon(Icons.card_giftcard_rounded, color: AppColors.success, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '₹${reward.amountValue.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    DateFormat('d MMM yyyy').format(reward.createdAt),
                    style: const TextStyle(fontSize: 11.5, color: AppColors.slate400),
                  ),
                ],
              ),
            ),
            AppBadge.forStatus(reward.status),
          ],
        ),
      ),
    );
  }
}
