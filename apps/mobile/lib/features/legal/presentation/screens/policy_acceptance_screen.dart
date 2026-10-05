import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/error_banner.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../data/policy_documents.dart';
import '../../providers/legal_providers.dart';
import '../widgets/policy_links.dart';

/// Asks a signed-in person to accept the legal documents before using the app (FR-008): after a Google/Apple
/// sign-up, which has no consent checkbox, or when a document changed since they last accepted it. The router keeps
/// them here until the profile has nothing pending.
class PolicyAcceptanceScreen extends ConsumerWidget {
  const PolicyAcceptanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(authStateProvider).value?.pendingPolicies ?? const <String>[];
    final pendingTitles = kPolicyDocuments.where((d) => pending.contains(d.policy)).map((d) => d.title).toList();
    final acceptState = ref.watch(policyAcceptanceProvider);

    return PopScope(
      // There is nowhere to go back to: the rest of the app waits for this.
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text(
            'Before you continue',
            style: TextStyle(color: AppColors.slate900, fontWeight: FontWeight.w700),
          ),
          backgroundColor: Colors.white,
          elevation: 0,
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.gavel_outlined, size: 40, color: AppColors.orange500),
                const SizedBox(height: 16),
                Text(
                  pendingTitles.isEmpty
                      ? 'Please review our policies.'
                      : 'Please review and accept our ${pendingTitles.join(', ')} to keep using Viralkar.',
                  style: const TextStyle(fontSize: 15.5, color: AppColors.slate800, height: 1.45),
                ),
                const SizedBox(height: 16),
                const PolicyLinks(prefix: 'Read the'),
                const Spacer(),
                if (acceptState.hasError) ...[ErrorBanner(acceptState.error.toString()), const SizedBox(height: 16)],
                LoadingButton(
                  label: 'I accept',
                  isLoading: acceptState.isLoading,
                  gradient: true,
                  // The router moves on by itself once nothing is pending.
                  onPressed: () => ref.read(policyAcceptanceProvider.notifier).accept(),
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: acceptState.isLoading
                        ? null
                        : () async {
                            await ref.read(authStateProvider.notifier).logout();
                            if (context.mounted) context.go(RoutePaths.login);
                          },
                    style: TextButton.styleFrom(foregroundColor: AppColors.slate500),
                    child: const Text('Not now — sign out'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
