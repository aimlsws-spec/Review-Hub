import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/result.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../../campaigns/presentation/widgets/campaign_card.dart';
import '../../../campaigns/providers/campaign_providers.dart';
import '../../../notifications/providers/notification_providers.dart';
import '../../../wallet/data/models/wallet_summary_model.dart';
import '../../../wallet/providers/wallet_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final walletAsync = ref.watch(walletSummaryProvider);
    final campaignsAsync = ref.watch(campaignsProvider);

    final firstName = authState.value?.firstName ?? 'there';

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        title: Text('Hi, $firstName 👋'),
        actions: const [_NotificationBellButton()],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(walletSummaryProvider);
          ref.invalidate(campaignsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _WalletCard(walletAsync: walletAsync),
            const SizedBox(height: 12),
            const _ReferralBanner(),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Available tasks', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                TextButton(
                  onPressed: () => context.push(RoutePaths.tasks),
                  child: const Text('See all'),
                ),
              ],
            ),
            const SizedBox(height: 4),
            campaignsAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
              error: (error, stack) => Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text('$error')),
              data: (result) => result.when(
                success: (page) {
                  if (page.items.isEmpty) {
                    return const EmptyState(icon: Icons.campaign_outlined, title: 'No campaigns right now');
                  }
                  final preview = page.items.take(3).toList();
                  return Column(
                    children: preview
                        .map((c) => CampaignCard(
                              campaign: c,
                              onTap: () => context.push(RoutePaths.campaignDetailPath(c.id)),
                            ))
                        .toList(),
                  );
                },
                failure: (failure) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(failure.message, style: const TextStyle(color: AppColors.danger)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WalletCard extends StatelessWidget {
  const _WalletCard({required this.walletAsync});

  final AsyncValue<Result<WalletSummaryModel>> walletAsync;

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
          const Text('Wallet balance', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 6),
          walletAsync.when(
            loading: () => const SizedBox(
              height: 32,
              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
            ),
            error: (error, stack) => const Text('—', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
            data: (result) {
              final balance = result.when(
                success: (wallet) => wallet.availableBalanceValue,
                failure: (_) => null,
              );
              return Text(
                balance != null ? '₹${balance.toStringAsFixed(2)}' : '—',
                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ReferralBanner extends StatelessWidget {
  const _ReferralBanner();

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(RoutePaths.referral),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.brand500, AppColors.brand600],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Refer & Earn', style: TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.w700)),
                  SizedBox(height: 2),
                  Text('Invite friends and earn a bonus together', style: TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Colors.white70),
          ],
        ),
      ),
    );
  }
}

/// Bell icon in the home app bar showing an unread-count badge.
class _NotificationBellButton extends ConsumerWidget {
  const _NotificationBellButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCountAsync = ref.watch(unreadCountProvider);
    final unreadCount = unreadCountAsync.value?.valueOrNull ?? 0;

    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => context.push(RoutePaths.notifications),
        ),
        if (unreadCount > 0)
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
              child: Text(
                unreadCount > 99 ? '99+' : '$unreadCount',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
  }
}
