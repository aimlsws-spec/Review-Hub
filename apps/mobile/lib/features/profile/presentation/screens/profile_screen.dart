import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/data/otp_type.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../../kyc/providers/kyc_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    // Null while it loads, so the prompt never flashes up for someone already verified.
    final identityVerified = ref.watch(identityVerifiedProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit profile',
            onPressed: () => context.push(RoutePaths.editProfile),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.primary100,
                  child: Text(
                    user?.initials ?? '?',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary700),
                  ),
                ),
                const SizedBox(height: 16),
                Text(user?.fullName ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                if (user?.email != null) Text(user!.email!, style: const TextStyle(color: AppColors.slate500)),
              ],
            ),
          ),
          // Identity verification is required for every earning feature, so it is asked for first.
          if (identityVerified == false) ...[
            const SizedBox(height: 20),
            _VerificationPrompt(
              key: const Key('identityPrompt'),
              label: 'Complete identity verification to start earning',
              onTap: () => context.push(RoutePaths.kyc),
            ),
          ],
          // Only the email is verified: codes go by email, and the phone number is contact information only.
          if (user != null && user.email != null && !user.isEmailVerified) ...[
            const SizedBox(height: 20),
            _VerificationPrompt(
              key: const Key('emailPrompt'),
              label: 'Verify your email',
              onTap: () => context.push(RoutePaths.otpVerification, extra: OtpType.emailVerification),
            ),
          ],
          const SizedBox(height: 24),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.card_giftcard_rounded, color: AppColors.primary600),
                  title: const Text('Refer & Earn'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.referral),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.emoji_events_outlined, color: AppColors.primary600),
                  title: const Text('Badges & Rewards'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.gamification),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.storefront_outlined, color: AppColors.primary600),
                  title: const Text('Marketplace'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.marketplace),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.emoji_events_outlined, color: AppColors.primary600),
                  title: const Text('My campaigns'),
                  subtitle: const Text('In progress and completed'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.myCampaigns),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.history_rounded, color: AppColors.primary600),
                  title: const Text('My submissions'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.mySubmissions),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.verified_user_outlined, color: AppColors.primary600),
                  title: const Text('KYC / Verification'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.kyc),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.support_agent_outlined, color: AppColors.primary600),
                  title: const Text('Help & Support'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.support),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.settings_outlined, color: AppColors.primary600),
                  title: const Text('Settings'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(RoutePaths.settings),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: OutlinedButton.icon(
              onPressed: () => ref.read(authStateProvider.notifier).logout(),
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('Sign out'),
            ),
          ),
        ],
      ),
    );
  }
}

class _VerificationPrompt extends StatelessWidget {
  const _VerificationPrompt({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.warningBg, borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.warningText),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.warningText))),
            const Icon(Icons.chevron_right, size: 18, color: AppColors.warningText),
          ],
        ),
      ),
    );
  }
}
