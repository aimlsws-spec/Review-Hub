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
          const Text('People you referred', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
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
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.navy900, Color(0xFF193255), AppColors.orange500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          stops: [0.0, 0.6, 1.0],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.navy900.withValues(alpha: 0.25), blurRadius: 12, offset: const Offset(0, 6))],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -10,
            child: Icon(Icons.card_giftcard_rounded, color: Colors.white.withValues(alpha: 0.05), size: 120),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Your referral code', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: Text(
                          code ?? '—',
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 1.5),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (code != null)
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: code!));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Referral code copied')),
                          );
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 2))],
                          ),
                          child: const Icon(Icons.copy_rounded, color: AppColors.navy900, size: 24),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text(
                  'Share this code with friends — you both earn a bonus when they join.',
                  style: TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.4),
                ),
              ],
            ),
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
        Expanded(child: _StatCard(icon: Icons.people_alt_rounded, label: 'Referred', value: '${stats.totalReferred}')),
        const SizedBox(width: 10),
        Expanded(child: _StatCard(icon: Icons.check_circle_rounded, label: 'Rewarded', value: '${stats.totalRewarded}')),
        const SizedBox(width: 10),
        Expanded(child: _StatCard(icon: Icons.monetization_on_rounded, label: 'Earned', value: '₹${stats.totalRewardEarned.toStringAsFixed(0)}')),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(color: AppColors.primary50, shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: AppColors.primary600),
          ),
          const SizedBox(height: 10),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500)),
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
