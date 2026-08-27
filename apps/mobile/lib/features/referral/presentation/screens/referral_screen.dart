import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../data/models/referral_model.dart';
import '../../providers/referral_providers.dart';

class ReferralScreen extends ConsumerWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final statsAsync = ref.watch(referralStatsProvider);
    final referralsAsync = ref.watch(myReferralsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: const Text('Refer & Earn')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ReferralCodeCard(code: user?.referralCode),
          const SizedBox(height: 16),
          statsAsync.when(
            loading: () => const SizedBox(height: 80, child: PageLoader()),
            error: (error, stack) => Text('$error'),
            data: (result) => result.when(
              success: (stats) => _StatsRow(stats: stats),
              failure: (failure) => Text(failure.message, style: const TextStyle(color: AppColors.danger)),
            ),
          ),
          const SizedBox(height: 24),
          const Text('People you referred', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          referralsAsync.when(
            loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
            error: (error, stack) => Text('$error'),
            data: (result) => result.when(
              success: (page) {
                if (page.items.isEmpty) {
                  return const EmptyState(
                    icon: Icons.people_outline_rounded,
                    title: 'No referrals yet',
                    description: 'Share your code — when a friend joins, they\'ll show up here.',
                  );
                }
                return Column(children: page.items.map((r) => _ReferralTile(referral: r)).toList());
              },
              failure: (failure) => Text(failure.message, style: const TextStyle(color: AppColors.danger)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReferralCodeCard extends StatelessWidget {
  const _ReferralCodeCard({required this.code});

  final String? code;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.brand500, AppColors.brand600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Your referral code', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                code ?? '—',
                style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 2),
              ),
              const Spacer(),
              if (code != null)
                IconButton(
                  icon: const Icon(Icons.copy_rounded, color: Colors.white),
                  tooltip: 'Copy code',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: code!));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Referral code copied')),
                    );
                  },
                ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Share this code with friends — you both earn a bonus when they join.',
            style: TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats});

  final ReferralStatsModel stats;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatCard(label: 'Referred', value: '${stats.totalReferred}')),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(label: 'Rewarded', value: '${stats.totalRewarded}')),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(label: 'Earned', value: '₹${stats.totalRewardEarned.toStringAsFixed(0)}')),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
        ],
      ),
    );
  }
}

class _ReferralTile extends StatelessWidget {
  const _ReferralTile({required this.referral});

  final ReferralModel referral;

  @override
  Widget build(BuildContext context) {
    final user = referral.referredUser;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primary100,
          child: Text(
            (user.firstName.isNotEmpty ? user.firstName[0] : '?').toUpperCase(),
            style: const TextStyle(color: AppColors.primary700, fontWeight: FontWeight.w700),
          ),
        ),
        title: Text('${user.firstName} ${user.lastName}'.trim(), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: Text('Joined ${DateFormat('d MMM yyyy').format(user.createdAt)}', style: const TextStyle(fontSize: 12)),
        trailing: referral.rewardIssued
            ? Text(
                '+₹${(referral.rewardAmountValue ?? 0).toStringAsFixed(0)}',
                style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w700),
              )
            : const Text('Pending', style: TextStyle(color: AppColors.slate400, fontSize: 12)),
      ),
    );
  }
}
