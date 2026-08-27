import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../campaigns/data/models/campaign_task_model.dart';
import '../../data/models/text_suggestion_model.dart';
import '../../providers/task_providers.dart';

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
  File? _pickedFile;
  bool _isSubmitting = false;
  String? _errorMessage;

  bool _isLoadingSuggestion = false;
  TextSuggestionModel? _suggestion;
  String? _suggestionError;

  @override
  void dispose() {
    _urlController.dispose();
    _textController.dispose();
    super.dispose();
  }

  Future<void> _getSuggestion() async {
    setState(() {
      _isLoadingSuggestion = true;
      _suggestionError = null;
    });

    final result = await ref.refresh(textSuggestionProvider(widget.taskId).future);

    if (!mounted) return;
    setState(() {
      _isLoadingSuggestion = false;
      _suggestion = result.valueOrNull;
      if (result.isFailure) {
        _suggestionError = result.failureOrNull?.message ?? 'Could not get a suggestion right now — try writing your own.';
      }
    });
  }

  void _copySuggestion() {
    Clipboard.setData(ClipboardData(text: _suggestion!.suggestion));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied')));
  }

  void _useSuggestion() {
    _textController.text = _suggestion!.suggestion;
    setState(() => _suggestion = null);
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked != null) setState(() => _pickedFile = File(picked.path));
  }

  Future<void> _submit() async {
    final needsFile = widget.task.acceptsFile && widget.task.proofRequired;
    final needsUrl = widget.task.acceptsUrl;
    final needsText = widget.task.acceptsText;

    if (needsFile && _pickedFile == null && _urlController.text.trim().isEmpty && _textController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please attach evidence: a screenshot, a link, or a written answer.');
      return;
    }
    if (needsUrl && !needsFile && _urlController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please enter a link as evidence.');
      return;
    }
    if (needsText && !needsFile && !needsUrl && _textController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please write your answer.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await ref.read(taskRepositoryProvider).submitTask(
          widget.taskId,
          filePath: _pickedFile?.path,
          externalUrl: _urlController.text.trim(),
          textAnswer: _textController.text.trim(),
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Could not submit — please try again.');
      return;
    }

    ref.read(submissionsRefreshProvider.notifier).state++;
    if (!mounted) return;
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
              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                  child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],
              if (task.supportsTextAssist) ...[
                _TextAssistCard(
                  isLoading: _isLoadingSuggestion,
                  suggestion: _suggestion,
                  error: _suggestionError,
                  showUseButton: task.acceptsText,
                  onGenerate: _getSuggestion,
                  onCopy: _copySuggestion,
                  onUse: _useSuggestion,
                ),
                const SizedBox(height: 20),
              ],
              if (task.acceptsFile) ...[
                const Text('Screenshot or photo', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                if (_pickedFile != null)
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_pickedFile!, height: 180, width: double.infinity, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 6,
                        right: 6,
                        child: IconButton(
                          style: IconButton.styleFrom(backgroundColor: Colors.black54, foregroundColor: Colors.white),
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => setState(() => _pickedFile = null),
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
              LoadingButton(label: 'Submit', isLoading: _isSubmitting, onPressed: _submit),
            ],
          ),
        ),
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
