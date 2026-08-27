import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../campaigns/data/models/campaign_task_model.dart';
import '../../../campaigns/providers/campaign_providers.dart';
import '../../providers/task_providers.dart';

class TaskDetailScreen extends ConsumerStatefulWidget {
  const TaskDetailScreen({super.key, required this.campaignId, required this.taskId});

  final String campaignId;
  final String taskId;

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  bool _isStarting = false;
  String? _errorMessage;

  Future<void> _startAndContinue(CampaignTaskModel task) async {
    setState(() {
      _isStarting = true;
      _errorMessage = null;
    });

    final result = await ref.read(taskRepositoryProvider).startTask(widget.taskId);

    if (!mounted) return;
    setState(() => _isStarting = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Could not start this task.');
      return;
    }
    context.push(RoutePaths.taskSubmissionPath(widget.taskId), extra: task);
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(campaignTasksProvider(widget.campaignId));

    return Scaffold(
      appBar: AppBar(title: const Text('Task details')),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('$error')),
        data: (result) => result.when(
          failure: (failure) => Center(child: Text(failure.message)),
          success: (tasks) {
            final matches = tasks.where((t) => t.id == widget.taskId);
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
                    if (_errorMessage != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                        child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      ),
                      const SizedBox(height: 12),
                    ],
                    LoadingButton(
                      label: 'Start task',
                      isLoading: _isStarting,
                      onPressed: () => _startAndContinue(task),
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
