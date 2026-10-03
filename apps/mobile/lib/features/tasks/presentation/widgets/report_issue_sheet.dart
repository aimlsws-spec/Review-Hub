import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/error_banner.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/task_providers.dart';

/// The backend refuses anything shorter (TaskIssueDto), so the form says so before sending.
const int kMinIssueDescriptionLength = 10;
const int kMaxIssueDescriptionLength = 1000;

final reportIssueSubmitProvider = AsyncNotifierProvider.autoDispose<ReportIssueSubmitNotifier, void>(
  ReportIssueSubmitNotifier.new,
);

/// Sends a task issue report, which support receives as a ticket linked to the task. Errors are surfaced through `state`.
class ReportIssueSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit(String taskId, String description) async {
    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).reportIssue(taskId, description);
    if (result.isFailure) {
      state = AsyncError(
        result.failureOrNull?.message ?? 'Could not send your report. Please try again.',
        StackTrace.current,
      );
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

/// Opens the sheet; resolves to true once the report was sent.
Future<bool> showReportIssueSheet(BuildContext context, String taskId) async {
  final sent = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => ReportIssueSheet(taskId: taskId),
  );
  return sent ?? false;
}

/// "Something wrong with this task?" form: a description, sent to support as a ticket.
class ReportIssueSheet extends ConsumerStatefulWidget {
  const ReportIssueSheet({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<ReportIssueSheet> createState() => _ReportIssueSheetState();
}

class _ReportIssueSheetState extends ConsumerState<ReportIssueSheet> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final sent = await ref
        .read(reportIssueSubmitProvider.notifier)
        .submit(widget.taskId, _descriptionController.text.trim());
    if (mounted && sent) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(reportIssueSubmitProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Report an issue',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.slate900),
            ),
            const SizedBox(height: 6),
            const Text(
              'Tell us what went wrong with this task. Our support team will look into it.',
              style: TextStyle(fontSize: 13.5, color: AppColors.slate600),
            ),
            const SizedBox(height: 16),
            if (submitState.hasError) ...[ErrorBanner(submitState.error.toString()), const SizedBox(height: 12)],
            TextFormField(
              key: const Key('issueDescription'),
              controller: _descriptionController,
              maxLines: 4,
              maxLength: kMaxIssueDescriptionLength,
              decoration: const InputDecoration(hintText: 'Describe the issue', border: OutlineInputBorder()),
              validator: (value) {
                final text = value?.trim() ?? '';
                if (text.isEmpty) return 'Describe the issue';
                if (text.length < kMinIssueDescriptionLength) {
                  return 'Please add a little more detail ($kMinIssueDescriptionLength+ characters)';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            LoadingButton(label: 'Send report', isLoading: submitState.isLoading, onPressed: _submit),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
