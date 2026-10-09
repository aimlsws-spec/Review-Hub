import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/campaign_progress_model.dart';

/// What a task's state means for the person, in words: shown on the campaign page and in place of "Start task".
String taskProgressLabel(TaskProgressModel progress) {
  switch (progress.state) {
    case TaskProgressState.available:
      return 'Available';
    case TaskProgressState.inReview:
      return 'In review';
    case TaskProgressState.completed:
      return 'Completed';
    case TaskProgressState.limitReached:
      final again = progress.availableAgainAt;
      return again == null ? 'Done for now' : 'Available again ${DateFormat('d MMM, h:mm a').format(again.toLocal())}';
  }
}

/// A small chip for a task that can not be started now: completed, in review, or done for this period.
/// Renders nothing for a task that is available.
class TaskProgressBadge extends StatelessWidget {
  const TaskProgressBadge({super.key, required this.progress});

  final TaskProgressModel progress;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color foreground, Color background) = switch (progress.state) {
      TaskProgressState.available => (Icons.circle_outlined, AppColors.slate500, AppColors.slate50),
      TaskProgressState.completed => (Icons.check_circle_rounded, AppColors.success, AppColors.successBg),
      TaskProgressState.inReview => (Icons.hourglass_top_rounded, AppColors.orange700, AppColors.orange50),
      TaskProgressState.limitReached => (Icons.schedule_rounded, AppColors.slate600, AppColors.slate100),
    };
    if (progress.state == TaskProgressState.available) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: foreground),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              taskProgressLabel(progress),
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: foreground),
            ),
          ),
        ],
      ),
    );
  }
}
