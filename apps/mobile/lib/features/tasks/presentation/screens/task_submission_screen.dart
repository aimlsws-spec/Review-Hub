import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../campaigns/data/models/campaign_task_model.dart';
import '../../data/models/text_suggestion_model.dart';
import '../../providers/task_providers.dart';
import '../widgets/honest_feedback_notice.dart';

final _pickedFileProvider = StateProvider.autoDispose<File?>((ref) => null);

final _suggestionProvider =
    AsyncNotifierProvider.autoDispose<_SuggestionNotifier, TextSuggestionModel?>(_SuggestionNotifier.new);

class _SuggestionNotifier extends AsyncNotifier<TextSuggestionModel?> {
  @override
  Future<TextSuggestionModel?> build() async => null;

  Future<void> generate(String taskId) async {
    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).getTextSuggestion(taskId);
    state = result.when(
      success: AsyncData.new,
      failure: (failure) => AsyncError(
        failure.message.isEmpty ? 'Could not get a suggestion right now — try writing your own.' : failure.message,
        StackTrace.current,
      ),
    );
  }

  void clear() => state = const AsyncData(null);
}

final _taskSubmitProvider = AsyncNotifierProvider.autoDispose<_TaskSubmitNotifier, void>(_TaskSubmitNotifier.new);

class _TaskSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({
    required CampaignTaskModel task,
    required String taskId,
    required File? pickedFile,
    required String url,
    required String text,
  }) async {
    final needsFile = task.acceptsFile && task.proofRequired;
    final needsUrl = task.acceptsUrl;
    final needsText = task.acceptsText;

    if (needsFile && pickedFile == null && url.isEmpty && text.isEmpty) {
      state = AsyncError('Please attach evidence: a screenshot, a link, or a written answer.', StackTrace.current);
      return false;
    }
    if (needsUrl && !needsFile && url.isEmpty) {
      state = AsyncError('Please enter a link as evidence.', StackTrace.current);
      return false;
    }
    if (needsText && !needsFile && !needsUrl && text.isEmpty) {
      state = AsyncError('Please write your answer.', StackTrace.current);
      return false;
    }

    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).submitTask(
          taskId,
          filePath: pickedFile?.path,
          externalUrl: url,
          textAnswer: text,
        );

    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not submit — please try again.', StackTrace.current);
      return false;
    }

    state = const AsyncData(null);
    ref.read(submissionsRefreshProvider.notifier).state++;
    return true;
  }
}

class TaskSubmissionScreen extends ConsumerStatefulWidget {
  const TaskSubmissionScreen({super.key, required this.taskId, required this.task});

  final String taskId;
  final CampaignTaskModel task;

  @override
  ConsumerState<TaskSubmissionScreen> createState() => _TaskSubmissionScreenState();
}

class _TaskSubmissionScreenState extends ConsumerState<TaskSubmissionScreen> {
  final _urlController = TextEditingController();
  final _textController = TextEditingController();

  @override
  void dispose() {
    _urlController.dispose();
    _textController.dispose();
    super.dispose();
  }

  void _copySuggestion(TextSuggestionModel suggestion) {
    Clipboard.setData(ClipboardData(text: suggestion.suggestion));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied')));
  }

  void _useSuggestion(TextSuggestionModel suggestion) {
    _textController.text = suggestion.suggestion;
    ref.read(_suggestionProvider.notifier).clear();
  }

  /// The assistant hands back the draft the person chose. It goes into the answer box when this task has one;
  /// otherwise it is already on the clipboard, ready to paste into the review they post themselves.
  Future<void> _openReviewAssistant() async {
    final draft = await context.push<String>(RoutePaths.reviewAssistantPath(widget.taskId));
    if (!mounted || draft == null) return;

    if (widget.task.acceptsText) {
      _textController.text = draft;
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Copied. Paste it into your review and change anything you like.')));
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked != null) ref.read(_pickedFileProvider.notifier).state = File(picked.path);
  }

  Future<void> _submit() async {
    final success = await ref.read(_taskSubmitProvider.notifier).submit(
          task: widget.task,
          taskId: widget.taskId,
          pickedFile: ref.read(_pickedFileProvider),
          url: _urlController.text.trim(),
          text: _textController.text.trim(),
        );

    if (!mounted || !success) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Submitted! We\'ll review it shortly.')),
    );
    // Pop back to the campaign/task screens, past this one.
    context.pop();
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final pickedFile = ref.watch(_pickedFileProvider);
    final submitState = ref.watch(_taskSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;
    final suggestionState = ref.watch(_suggestionProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Submit evidence')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(task.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),
              if (errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
                  child: Text(errorMessage, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],
              if (task.isReviewTask) ...[
                const HonestFeedbackNotice(),
                const SizedBox(height: 12),
                _ReviewAssistantCard(onOpen: _openReviewAssistant),
                const SizedBox(height: 20),
              ] else if (task.supportsTextAssist) ...[
                _TextAssistCard(
                  isLoading: suggestionState.isLoading,
                  suggestion: suggestionState.value,
                  error: suggestionState.hasError ? suggestionState.error.toString() : null,
                  showUseButton: task.acceptsText,
                  onGenerate: () => ref.read(_suggestionProvider.notifier).generate(widget.taskId),
                  onCopy: () => _copySuggestion(suggestionState.value!),
                  onUse: () => _useSuggestion(suggestionState.value!),
                ),
                const SizedBox(height: 20),
              ],
              if (task.acceptsFile) ...[
                const Text('Screenshot or photo', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                if (pickedFile != null)
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(pickedFile, height: 180, width: double.infinity, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 6,
                        right: 6,
                        child: IconButton(
                          style: IconButton.styleFrom(backgroundColor: Colors.black54, foregroundColor: Colors.white),
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => ref.read(_pickedFileProvider.notifier).state = null,
                        ),
                      ),
                    ],
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _pickImage(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt_outlined, size: 18),
                          label: const Text('Camera'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _pickImage(ImageSource.gallery),
                          icon: const Icon(Icons.photo_library_outlined, size: 18),
                          label: const Text('Gallery'),
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 20),
              ],
              if (task.acceptsUrl) ...[
                TextField(
                  controller: _urlController,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(labelText: 'Link', hintText: 'https://…'),
                ),
                const SizedBox(height: 20),
              ],
              if (task.acceptsText) ...[
                TextField(
                  controller: _textController,
                  maxLines: 4,
                  maxLength: 2000,
                  decoration: const InputDecoration(labelText: 'Your answer', alignLabelWithHint: true),
                ),
                const SizedBox(height: 12),
              ],
              LoadingButton(label: 'Submit', isLoading: submitState.isLoading, onPressed: _submit),
            ],
          ),
        ),
      ),
    );
  }
}

/// Opens the guided review assistant. Optional: the person can write their review without it.
class _ReviewAssistantCard extends StatelessWidget {
  const _ReviewAssistantCard({required this.onOpen});

  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary100),
      ),
      child: Row(
        children: [
          const Icon(Icons.auto_awesome, size: 18, color: AppColors.primary600),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Need help putting it into words?',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(onPressed: onOpen, child: const Text('Help me write')),
        ],
      ),
    );
  }
}

/// AI-drafted review/caption helper — free to use, optional. Shown only for
/// task types where a written draft makes sense (see [CampaignTaskModelX.supportsTextAssist]).
class _TextAssistCard extends StatelessWidget {
  const _TextAssistCard({
    required this.isLoading,
    required this.suggestion,
    required this.error,
    required this.showUseButton,
    required this.onGenerate,
    required this.onCopy,
    required this.onUse,
  });

  final bool isLoading;
  final TextSuggestionModel? suggestion;
  final String? error;
  final bool showUseButton;
  final VoidCallback onGenerate;
  final VoidCallback onCopy;
  final VoidCallback onUse;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, size: 18, color: AppColors.primary600),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('Need help writing this?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
              if (!isLoading)
                TextButton(
                  onPressed: onGenerate,
                  child: Text(suggestion == null ? 'Suggest text' : 'Try again'),
                ),
            ],
          ),
          if (isLoading)
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Center(child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))),
            ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
            ),
          if (suggestion != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(8)),
              child: Text(suggestion!.suggestion, style: const TextStyle(fontSize: 13)),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton.icon(
                  onPressed: onCopy,
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  label: const Text('Copy'),
                ),
                if (showUseButton)
                  TextButton.icon(
                    onPressed: onUse,
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Use this'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
