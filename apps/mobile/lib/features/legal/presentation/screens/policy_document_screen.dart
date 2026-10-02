import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/failure.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/policy_documents.dart';
import '../../providers/legal_providers.dart';

/// Shows one legal text (Terms, Privacy Policy, Reward Policy) as published in the admin portal's CMS.
class PolicyDocumentScreen extends ConsumerWidget {
  const PolicyDocumentScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(contentPageProvider(slug));
    final knownTitle = kPolicyDocuments.where((d) => d.slug == slug).map((d) => d.title).firstOrNull;

    return Scaffold(
      appBar: AppBar(title: Text(page.value?.title ?? knownTitle ?? 'Policy')),
      body: SafeArea(
        child: page.when(
          loading: () => const LoadingIndicator(),
          error: (error, _) => _PageError(
            // 404 means the admin has not published this page yet, which is not something a retry fixes.
            message: error is NotFoundFailure
                ? 'This document has not been published yet. Please check again later.'
                : (error is Failure ? error.message : 'Could not load this document.'),
            onRetry: error is NotFoundFailure ? null : () => ref.invalidate(contentPageProvider(slug)),
          ),
          data: (page) => SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: SelectableText(
              page.content,
              style: const TextStyle(fontSize: 14.5, height: 1.55, color: AppColors.slate800),
            ),
          ),
        ),
      ),
    );
  }
}

class _PageError extends StatelessWidget {
  const _PageError({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.slate600),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              TextButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}
