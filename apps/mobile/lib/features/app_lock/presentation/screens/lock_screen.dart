import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../providers/app_lock_providers.dart';

/// Covers the app until the phone confirms its owner.
///
/// Signing out is always offered: a person whose fingerprint keeps failing, on a phone they can not otherwise
/// unlock, still has a way forward.
class LockScreen extends ConsumerWidget {
  const LockScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lock = ref.watch(appLockProvider);

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
                  child: const Icon(Icons.lock_rounded, size: 42, color: AppColors.orange700),
                ),
                const SizedBox(height: 24),
                const Text(
                  'VIRAL KAR is locked',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.navy900),
                ),
                const SizedBox(height: 10),
                Text(
                  lock.message ?? 'Use your fingerprint, face or screen lock to continue.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14.5,
                    height: 1.5,
                    color: lock.message == null ? AppColors.slate600 : AppColors.danger,
                  ),
                ),
                const SizedBox(height: 28),
                FilledButton.icon(
                  onPressed: lock.checking ? null : () => ref.read(appLockProvider.notifier).unlock(),
                  icon: const Icon(Icons.fingerprint_rounded),
                  label: const Text('Unlock'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => ref.read(authStateProvider.notifier).logout(),
                  child: const Text('Sign out'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
