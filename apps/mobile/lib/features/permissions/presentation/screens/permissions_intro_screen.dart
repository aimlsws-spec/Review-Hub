import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/permissions_providers.dart';

/// Shown once, right after the first sign-in on a phone: what each permission is for, before the system asks.
/// Nothing here is required. Location and camera are asked for again at the moment a task needs them, so "Later"
/// costs nothing but that later prompt.
class PermissionsIntroScreen extends ConsumerWidget {
  const PermissionsIntroScreen({super.key});

  Future<void> _continue(BuildContext context, WidgetRef ref) async {
    await ref.read(permissionsIntroProvider.notifier).finish();
    if (context.mounted) context.go(RoutePaths.home);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asked = ref.watch(permissionsIntroProvider);

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'A few permissions',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.slate900),
              ),
              const SizedBox(height: 8),
              const Text(
                'Here is what VIRAL KAR asks for and why. You can change any of these later in your phone\'s settings.',
                style: TextStyle(fontSize: 14.5, color: AppColors.slate600, height: 1.45),
              ),
              const SizedBox(height: 24),
              _PermissionCard(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                reason: 'To tell you when a reward is approved, a withdrawal is paid, or a new campaign is available.',
                status: asked[IntroPermission.notifications],
                onAllow: () => ref.read(permissionsIntroProvider.notifier).allow(IntroPermission.notifications),
              ),
              _PermissionCard(
                icon: Icons.location_on_outlined,
                title: 'Location',
                reason:
                    'Only for store check-in tasks and to sort campaigns by distance. Never tracked in the background.',
                status: asked[IntroPermission.location],
                onAllow: () => ref.read(permissionsIntroProvider.notifier).allow(IntroPermission.location),
              ),
              const _PermissionCard(
                icon: Icons.photo_camera_outlined,
                title: 'Camera and photos',
                reason:
                    'To scan a store\'s QR code and to add a screenshot or photo as proof of a task. '
                    'Your phone asks the first time you do either.',
              ),
              const SizedBox(height: 24),
              LoadingButton(label: 'Continue', gradient: true, onPressed: () => _continue(context, ref)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PermissionCard extends StatelessWidget {
  const _PermissionCard({required this.icon, required this.title, required this.reason, this.status, this.onAllow});

  final IconData icon;
  final String title;
  final String reason;

  /// Null when not asked yet, true when allowed, false when declined.
  final bool? status;

  /// Null for a permission that is only asked for when it is used.
  final VoidCallback? onAllow;

  @override
  Widget build(BuildContext context) {
    final Widget trailing = onAllow == null
        ? const SizedBox.shrink()
        : switch (status) {
            null => TextButton(
              onPressed: onAllow,
              style: TextButton.styleFrom(foregroundColor: AppColors.orange700),
              child: const Text('Allow'),
            ),
            true => const Icon(Icons.check_circle, color: AppColors.success),
            false => const Text('Later', style: TextStyle(color: AppColors.slate500)),
          };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary500),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.slate900),
                ),
                const SizedBox(height: 4),
                Text(reason, style: const TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.4)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          trailing,
        ],
      ),
    );
  }
}
