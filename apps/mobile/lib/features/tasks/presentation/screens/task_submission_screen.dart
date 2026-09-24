import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/location/location_coordinates.dart';
import '../../../../core/location/location_providers.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../campaigns/data/models/campaign_task_model.dart';
import '../../data/models/text_suggestion_model.dart';
import '../../providers/task_providers.dart';
import '../widgets/honest_feedback_notice.dart';

final _pickedFileProvider = StateProvider.autoDispose<File?>((ref) => null);
final _scannedCodeProvider = StateProvider.autoDispose<String?>((ref) => null);

final _locationCheckProvider =
    AsyncNotifierProvider.autoDispose<_LocationCheckNotifier, LocationCoordinates?>(_LocationCheckNotifier.new);

class _LocationCheckNotifier extends AsyncNotifier<LocationCoordinates?> {
  @override
  Future<LocationCoordinates?> build() async => null;

  Future<void> check() async {
    state = const AsyncLoading();
    final result = await ref.read(locationServiceProvider).getCurrentLocation();
    state = result.when(
      success: AsyncData.new,
      failure: (failure) => AsyncError(failure.message, StackTrace.current),
    );
  }
}

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
    required String? scannedCode,
    required LocationCoordinates? location,
  }) async {
    if (task.isQrScanTask) {
      if (scannedCode == null || scannedCode.isEmpty) {
        state = AsyncError('Please scan the QR code first.', StackTrace.current);
        return false;
      }
    } else if (task.isLocationCheckInTask) {
      if (location == null) {
        state = AsyncError('Please check your location first.', StackTrace.current);
        return false;
      }
    } else {
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
    }

    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).submitTask(
          taskId,
          filePath: pickedFile?.path,
          externalUrl: url,
          textAnswer: task.isQrScanTask ? scannedCode : text,
          latitude: location?.latitude,
          longitude: location?.longitude,
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

  void _openAiStory() {
    context.push(RoutePaths.aiStoryPath(widget.taskId));
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked != null) ref.read(_pickedFileProvider.notifier).state = File(picked.path);
  }

  Future<void> _scanQrCode() async {
    final code = await context.push<String>(RoutePaths.qrScanner);
    if (code != null) ref.read(_scannedCodeProvider.notifier).state = code;
  }

  Future<void> _submit() async {
    final success = await ref.read(_taskSubmitProvider.notifier).submit(
          task: widget.task,
          taskId: widget.taskId,
          pickedFile: ref.read(_pickedFileProvider),
          url: _urlController.text.trim(),
          text: _textController.text.trim(),
          scannedCode: ref.read(_scannedCodeProvider),
          location: ref.read(_locationCheckProvider).value,
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
              if (task.isStoryTask) ...[
                _StoryAssistCard(onOpen: _openAiStory),
                const SizedBox(height: 20),
              ],
              if (task.isQrScanTask) ...[
                _QrScanCard(
                  scannedCode: ref.watch(_scannedCodeProvider),
                  onScan: _scanQrCode,
                  onClear: () => ref.read(_scannedCodeProvider.notifier).state = null,
                ),
                const SizedBox(height: 20),
              ],
              if (task.isLocationCheckInTask) ...[
                _LocationCheckInCard(
                  state: ref.watch(_locationCheckProvider),
                  onCheck: () => ref.read(_locationCheckProvider.notifier).check(),
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

/// Opens the AI story composer — free to use, optional. Shown only for tasks where posting a story
/// is the point (see [CampaignTaskModelX.isStoryTask]); independent of the review/text-assist cards
/// above since a task can want both a caption suggestion and a composed story image.
class _StoryAssistCard extends StatelessWidget {
  const _StoryAssistCard({required this.onOpen});

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
              'Turn a photo into a ready-to-post story?',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(onPressed: onOpen, child: const Text('Create a story')),
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

/// Either a "Scan QR code" button, or confirmation that one was scanned with a way to redo it.
/// Never shows the expected code — the backend never sends it to the app either; see
/// CampaignTaskService.redactForParticipant.
class _QrScanCard extends StatelessWidget {
  const _QrScanCard({required this.scannedCode, required this.onScan, required this.onClear});

  final String? scannedCode;
  final VoidCallback onScan;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    if (scannedCode == null) {
      return OutlinedButton.icon(
        onPressed: onScan,
        icon: const Icon(Icons.qr_code_scanner, size: 18),
        label: const Text('Scan QR code'),
      );
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: 20),
          const SizedBox(width: 10),
          const Expanded(child: Text('QR code scanned', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
          TextButton(onPressed: onClear, child: const Text('Scan again')),
        ],
      ),
    );
  }
}

/// Captures the device's current position on demand — never automatically — for a LOCATION_CHECKIN task.
/// The backend has the final say on whether it's close enough; this only gets a reading to send.
class _LocationCheckInCard extends StatelessWidget {
  const _LocationCheckInCard({required this.state, required this.onCheck});

  final AsyncValue<LocationCoordinates?> state;
  final VoidCallback onCheck;

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
          const Row(
            children: [
              Icon(Icons.location_on_outlined, size: 18, color: AppColors.primary600),
              SizedBox(width: 8),
              Expanded(child: Text('Check in at this location', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
            ],
          ),
          const SizedBox(height: 10),
          state.when(
            data: (coordinates) => coordinates == null
                ? OutlinedButton.icon(
                    onPressed: onCheck,
                    icon: const Icon(Icons.my_location, size: 18),
                    label: const Text('Check my location'),
                  )
                : Row(
                    children: [
                      const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('Location captured', style: TextStyle(fontSize: 13))),
                      TextButton(onPressed: onCheck, child: const Text('Recheck')),
                    ],
                  ),
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            error: (error, _) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$error', style: const TextStyle(color: AppColors.danger, fontSize: 12)),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: onCheck,
                  icon: const Icon(Icons.my_location, size: 18),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
