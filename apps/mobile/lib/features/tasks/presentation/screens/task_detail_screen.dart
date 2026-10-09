import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../campaigns/data/models/campaign_progress_model.dart';
import '../../../campaigns/data/models/campaign_task_model.dart';
import '../../../campaigns/presentation/widgets/task_progress_badge.dart';
import '../../../campaigns/providers/campaign_providers.dart';
import '../../../kyc/presentation/widgets/identity_gate.dart';
import '../../providers/task_providers.dart';
import '../widgets/honest_feedback_notice.dart';
import '../widgets/report_issue_sheet.dart';
import '../widgets/task_link_button.dart';

final _startTaskSubmitProvider = AsyncNotifierProvider.autoDispose<_StartTaskSubmitNotifier, void>(_StartTaskSubmitNotifier.new);

class _StartTaskSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> start(String taskId) async {
    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).startTask(taskId);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not start this task.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

/// How often a repeatable task can be done, e.g. "Once a day", "3 times a week". Empty for a once-only task.
String completionLimitLabel(String completionLimit, int maxCompletionsPerPeriod) {
  const periods = {'DAILY': 'day', 'WEEKLY': 'week', 'MONTHLY': 'month'};
  final period = periods[completionLimit];
  if (period == null) return '';
  return maxCompletionsPerPeriod == 1 ? 'Once a $period' : '$maxCompletionsPerPeriod times a $period';
}

class TaskDetailScreen extends ConsumerWidget {
  const TaskDetailScreen({super.key, required this.campaignId, required this.taskId});

  final String campaignId;
  final String taskId;

  Future<void> _reportIssue(BuildContext context) async {
    final sent = await showReportIssueSheet(context, taskId);
    if (sent && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks. Your report was sent to support.')));
    }
  }

  Future<void> _startAndContinue(BuildContext context, WidgetRef ref, CampaignTaskModel task) async {
    if (!await ensureIdentityVerified(context, ref) || !context.mounted) return;
    final success = await ref.read(_startTaskSubmitProvider.notifier).start(taskId);
    if (!context.mounted || !success) return;
    context.push(RoutePaths.taskSubmissionPath(taskId), extra: task);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(campaignTasksProvider(campaignId));
    final progress = ref.watch(campaignProgressProvider(campaignId)).value?.valueOrNull?.forTask(taskId);
    final submitState = ref.watch(_startTaskSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.report_problem_outlined),
            onPressed: () => _reportIssue(context),
            tooltip: 'Report an issue',
          ),
        ],
      ),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('$error')),
        data: (result) => result.when(
          failure: (failure) => Center(child: Text(failure.message)),
          success: (tasks) {
            final matches = tasks.where((t) => t.id == taskId);
            if (matches.isEmpty) {
              return const Center(child: Text('This task is no longer available.'));
            }
            final task = matches.first;

            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(task.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                            if (task.rewardAmountValue != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Earn ₹${task.rewardAmountValue!.toStringAsFixed(0)}',
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.success),
                              ),
                            ],
                            if (task.description != null) ...[
                              const SizedBox(height: 16),
                              Text(task.description!, style: const TextStyle(fontSize: 14, color: AppColors.slate600, height: 1.5)),
                            ],
                            if (task.targetUri != null) ...[const SizedBox(height: 16), TaskLinkButton(task: task)],
                            if (completionLimitLabel(task.completionLimit, task.maxCompletionsPerPeriod).isNotEmpty) ...[
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  const Icon(Icons.repeat, size: 16, color: AppColors.slate400),
                                  const SizedBox(width: 6),
                                  Text(
                                    completionLimitLabel(task.completionLimit, task.maxCompletionsPerPeriod),
                                    style: const TextStyle(fontSize: 13, color: AppColors.slate500, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ],
                            if (task.instructions != null) ...[
                              const SizedBox(height: 16),
                              const Text('Instructions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 6),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(10)),
                                child: Text(task.instructions!, style: const TextStyle(fontSize: 13.5, color: AppColors.slate600, height: 1.5)),
                              ),
                            ],
                            if (task.isReviewTask) ...[const SizedBox(height: 16), const HonestFeedbackNotice()],
                            if (task.proofRequired) ...[
                              const SizedBox(height: 16),
                              const Row(
                                children: [
                                  Icon(Icons.info_outline, size: 16, color: AppColors.slate400),
                                  SizedBox(width: 6),
                                  Text('Proof of completion is required', style: TextStyle(fontSize: 12.5, color: AppColors.slate500)),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    if (errorMessage != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
                        child: Text(errorMessage, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (progress != null && !progress.canStart)
                      _NotAvailableNotice(progress: progress)
                    else
                      LoadingButton(
                        label: 'Start task',
                        isLoading: submitState.isLoading,
                        onPressed: () => _startAndContinue(context, ref, task),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// In place of "Start task" when the task can not be done now: says why, so nobody takes a screenshot for nothing.
class _NotAvailableNotice extends StatelessWidget {
  const _NotAvailableNotice({required this.progress});

  final TaskProgressModel progress;

  @override
  Widget build(BuildContext context) {
    final message = switch (progress.state) {
      TaskProgressState.completed => 'You have completed this task. Each person can do it only once.',
      TaskProgressState.inReview => 'Your proof is being checked. You will be notified when it is approved.',
      TaskProgressState.limitReached => 'You have done this task as often as allowed for now.',
      TaskProgressState.available => '',
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TaskProgressBadge(progress: progress),
          const SizedBox(height: 8),
          Text(message, style: const TextStyle(fontSize: 13, color: AppColors.slate600, height: 1.4)),
        ],
      ),
    );
  }
}
