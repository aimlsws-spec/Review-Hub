import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../app_status/providers/app_status_providers.dart';
import '../../../campaigns/data/models/campaign_task_model.dart';

/// "Open on Instagram": takes the participant to where the task is done (the merchant's Google review page,
/// Instagram profile, post to share...), set by the merchant on the task. Renders nothing when the task has no link.
class TaskLinkButton extends ConsumerWidget {
  const TaskLinkButton({super.key, required this.task});

  final CampaignTaskModel task;

  Future<void> _open(BuildContext context, WidgetRef ref, Uri uri) async {
    var opened = false;
    try {
      opened = await ref.read(urlOpenerProvider)(uri);
    } on Exception {
      opened = false;
    }
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Could not open the link. You can open it yourself: $uri')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uri = task.targetUri;
    if (uri == null) return const SizedBox.shrink();
    final site = task.targetSiteName;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        OutlinedButton.icon(
          onPressed: () => _open(context, ref, uri),
          icon: const Icon(Icons.open_in_new_rounded, size: 18),
          label: Text(site == null ? 'Open link' : 'Open on $site'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary600,
            side: const BorderSide(color: AppColors.primary200),
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          uri.host,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11.5, color: AppColors.slate400),
        ),
      ],
    );
  }
}
