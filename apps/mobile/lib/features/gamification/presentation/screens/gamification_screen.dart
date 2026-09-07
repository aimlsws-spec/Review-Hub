import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/badge_model.dart';
import '../../data/models/gamification_profile_model.dart';
import '../../providers/gamification_providers.dart';

class GamificationScreen extends ConsumerWidget {
  const GamificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(gamificationProfileProvider);
    final badgesAsync = ref.watch(badgesProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: const Text('Badges & Rewards')),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(gamificationRefreshProvider.notifier).state++,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            profileAsync.when(
              loading: () => const SizedBox(height: 140, child: PageLoader()),
              error: (error, stack) => Text('$error'),
              data: (result) => result.when(
                success: (profile) => _ProfileCard(profile: profile),
                failure: (failure) => Text(failure.message, style: const TextStyle(color: AppColors.danger)),
              ),
            ),
            const SizedBox(height: 16),
            const _DailyRewardCard(),
            const SizedBox(height: 24),
            const Text('Badges', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            badgesAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
              error: (error, stack) => Text('$error'),
              data: (result) => result.when(
                success: (badges) {
                  if (badges.isEmpty) {
                    return const EmptyState(icon: Icons.emoji_events_outlined, title: 'No badges available yet');
                  }
                  return GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 0.85,
                    children: badges.map((b) => _BadgeTile(badge: b)).toList(),
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

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile});

  final GamificationProfileModel profile;

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
          const Text('Level', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 6),
          Text('${profile.level}', style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatChip(label: 'XP', value: '${profile.xp}'),
              const SizedBox(width: 20),
              _StatChip(label: 'Current streak', value: '${profile.currentStreak}d'),
              const SizedBox(width: 20),
              _StatChip(label: 'Best streak', value: '${profile.longestStreak}d'),
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

class _DailyRewardCard extends ConsumerStatefulWidget {
  const _DailyRewardCard();

  @override
  ConsumerState<_DailyRewardCard> createState() => _DailyRewardCardState();
}

class _DailyRewardCardState extends ConsumerState<_DailyRewardCard> {
  bool _claiming = false;
  bool _claimedJustNow = false;

  Future<void> _claim() async {
    setState(() => _claiming = true);
    final result = await ref.read(gamificationRepositoryProvider).claimDailyReward();
    if (!mounted) return;
    setState(() => _claiming = false);

    result.when(
      success: (reward) {
        setState(() => _claimedJustNow = true);
        ref.read(gamificationRefreshProvider.notifier).state++;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('You won ${reward.prize.label} (+₹${reward.prize.amount.toStringAsFixed(0)})!')),
        );
      },
      failure: (failure) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failure.message)));
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final claimed = _claimedJustNow;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(color: AppColors.primary50, shape: BoxShape.circle),
              child: const Icon(Icons.card_giftcard_rounded, color: AppColors.primary600),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Daily reward', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  Text('Come back every day for a bonus.', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                ],
              ),
            ),
            LoadingButton(
              label: claimed ? 'Claimed' : 'Claim',
              isLoading: _claiming,
              onPressed: claimed ? null : _claim,
            ),
          ],
        ),
      ),
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.badge});

  final BadgeModel badge;

  Widget _fallbackIcon(bool earned) {
    return Icon(
      Icons.emoji_events_rounded,
      size: 28,
      color: earned ? AppColors.primary600 : AppColors.slate300,
    );
  }

  @override
  Widget build(BuildContext context) {
    final earned = badge.earned;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: earned ? AppColors.primary50 : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: earned ? AppColors.primary200 : AppColors.slate100),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (badge.iconUrl != null)
            Opacity(
              opacity: earned ? 1 : 0.4,
              child: CachedNetworkImage(
                imageUrl: badge.iconUrl!,
                width: 28,
                height: 28,
                errorWidget: (context, url, error) => _fallbackIcon(earned),
              ),
            )
          else
            _fallbackIcon(earned),
          const SizedBox(height: 6),
          Text(
            badge.name,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: earned ? AppColors.slate900 : AppColors.slate400,
            ),
          ),
        ],
      ),
    );
  }
}
