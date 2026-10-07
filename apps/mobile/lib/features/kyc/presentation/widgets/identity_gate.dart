import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/identity_requirement.dart';
import '../../providers/kyc_providers.dart';

/// Shows [child] only once the person has uploaded PAN or an identity document; until then, a screen explaining
/// why the feature is locked with a way to verify. Wraps the earning routes in the router, so every way into them
/// (tabs, home cards, profile, push notifications) is covered in one place.
class IdentityGate extends ConsumerWidget {
  const IdentityGate({
    super.key,
    required this.featureName,
    required this.child,
  });

  /// The locked feature's name, used as the title while it is locked.
  final String featureName;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(identityVerifiedProvider)
        .when(
          loading: () => Scaffold(
            appBar: AppBar(title: Text(featureName)),
            body: const PageLoader(),
          ),
          // The check itself failed: open the screen; the server still refuses the earning actions.
          error: (_, _) => child,
          data: (verified) => verified
              ? child
              : _IdentityRequiredView(featureName: featureName),
        );
  }
}

class _IdentityRequiredView extends StatelessWidget {
  const _IdentityRequiredView({required this.featureName});

  final String featureName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(featureName)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: EmptyState(
            key: const Key('identityRequired'),
            icon: Icons.verified_user_outlined,
            title: 'Complete identity verification',
            description: kIdentityRequiredMessage,
            action: FilledButton(
              onPressed: () => context.push(RoutePaths.kyc),
              child: const Text('Verify identity'),
            ),
          ),
        ),
      ),
    );
  }
}

/// For an earning action on a screen that is open to everyone (starting a task, claiming the daily reward): true when
/// the person may go ahead, otherwise shows why not, offers to verify now, and returns false.
Future<bool> ensureIdentityVerified(BuildContext context, WidgetRef ref) async {
  // Read straight from the repository rather than the screen-scoped provider, so the answer is current.
  final result = await ref.read(kycRepositoryProvider).getDocuments();
  // Could not check: go ahead; the server refuses the action itself, with the same message.
  final verified = result.when(
    success: hasIdentityDocument,
    failure: (_) => true,
  );
  if (verified || !context.mounted) return verified;

  final verifyNow = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Identity verification required'),
      content: const Text(kIdentityRequiredMessage),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(false),
          child: const Text('Not now'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(true),
          child: const Text('Verify now'),
        ),
      ],
    ),
  );
  if (verifyNow == true && context.mounted) context.push(RoutePaths.kyc);
  return false;
}
