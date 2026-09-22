import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../providers/app_status_providers.dart';

/// Shown instead of the app while the platform is in maintenance.
class MaintenanceScreen extends ConsumerWidget {
  const MaintenanceScreen({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _FullPageMessage(
      icon: Icons.build_circle_outlined,
      title: 'We will be right back',
      message: message,
      actionLabel: 'Try again',
      onAction: () => ref.read(appStatusProvider.notifier).check(),
    );
  }
}

/// Shown instead of the app when this build is older than the server supports.
class UpdateRequiredScreen extends ConsumerWidget {
  const UpdateRequiredScreen({super.key, required this.minimumVersion, this.updateUrl});

  final String minimumVersion;
  final String? updateUrl;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final url = updateUrl;
    return _FullPageMessage(
      icon: Icons.system_update_rounded,
      title: 'Please update the app',
      message: minimumVersion.isEmpty
          ? 'This version of the app is no longer supported. Please update to keep earning.'
          : 'This version of the app is no longer supported. Please update to version $minimumVersion or newer to keep earning.',
      actionLabel: url == null ? 'Check again' : 'Update now',
      onAction: () async {
        if (url == null) {
          await ref.read(appStatusProvider.notifier).check();
          return;
        }
        final opened = await ref.read(urlOpenerProvider)(Uri.parse(url));
        if (!opened && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open the store. Please update from the Play Store.')),
          );
        }
      },
    );
  }
}

class _FullPageMessage extends StatelessWidget {
  const _FullPageMessage({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: const BoxDecoration(color: AppColors.orange50, shape: BoxShape.circle),
                  child: Icon(icon, size: 44, color: AppColors.orange700),
                ),
                const SizedBox(height: 24),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.navy900),
                ),
                const SizedBox(height: 10),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14.5, height: 1.5, color: AppColors.slate600),
                ),
                const SizedBox(height: 28),
                FilledButton(onPressed: onAction, child: Text(actionLabel)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
