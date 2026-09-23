import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/task_submission_model.dart';
import '../../providers/task_providers.dart';

class MySubmissionsScreen extends ConsumerWidget {
  const MySubmissionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final submissionsAsync = ref.watch(mySubmissionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Submissions')),
      body: submissionsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(mySubmissionsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(mySubmissionsProvider)),
          success: (page) {
            if (page.items.isEmpty) {
              return const EmptyState(
                icon: Icons.history_rounded,
                title: 'No submissions yet',
                description: 'Complete a task to see it show up here.',
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(mySubmissionsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: page.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) => _SubmissionTile(submission: page.items[index]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SubmissionTile extends ConsumerWidget {
  const _SubmissionTile({required this.submission});

  final TaskSubmissionModel submission;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppBadge.forStatus(submission.status),
                Text(
                  DateFormat('d MMM, h:mm a').format(submission.createdAt),
                  style: const TextStyle(fontSize: 11.5, color: AppColors.slate400),
                ),
              ],
            ),
            if (submission.rewardAmountValue != null) ...[
              const SizedBox(height: 8),
              Text(
                '₹${submission.rewardAmountValue!.toStringAsFixed(0)}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.success),
              ),
            ],
            if (submission.isRejected && submission.rejectionReason != null) ...[
              const SizedBox(height: 6),
              Text(
                submission.rejectionReason!,
                style: const TextStyle(fontSize: 12.5, color: AppColors.danger),
              ),
              if (submission.dispute == null)
                TextButton(
                  onPressed: () => _showDisputeDialog(context, ref, submission.id),
                  child: const Text('Dispute this rejection'),
                )
              else
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    'Dispute status: ${submission.dispute!.status}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

Future<void> _showDisputeDialog(BuildContext context, WidgetRef ref, String submissionId) async {
  final controller = TextEditingController();
  final reason = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Dispute this rejection'),
      content: TextField(
        controller: controller,
        autofocus: true,
        maxLines: 4,
        maxLength: 1000,
        decoration: const InputDecoration(hintText: 'Explain why this submission should be approved'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          child: const Text('Submit'),
        ),
      ],
    ),
  );
  if (reason == null || reason.isEmpty || !context.mounted) return;

  final result = await ref.read(taskRepositoryProvider).createDispute(submissionId, reason);
  if (!context.mounted) return;
  result.when(
    success: (_) {
      ref.invalidate(mySubmissionsProvider);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Dispute submitted')));
    },
    failure: (failure) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failure.message)));
    },
  );
}
