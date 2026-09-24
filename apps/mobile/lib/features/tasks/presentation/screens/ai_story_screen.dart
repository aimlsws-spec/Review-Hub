import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../data/models/story_result_model.dart';
import '../../providers/story_providers.dart';

final _pickedPhotoProvider = StateProvider.autoDispose<File?>((ref) => null);

/// Turns one photo into a ready-to-post story: a story-shaped image plus a caption and hashtags,
/// composed server-side (apps/backend's ai-assist.service.ts) from the task's own campaign — nothing
/// about the campaign is entered here. Picking a new photo after a result exists starts over.
class AiStoryScreen extends ConsumerStatefulWidget {
  const AiStoryScreen({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<AiStoryScreen> createState() => _AiStoryScreenState();
}

class _AiStoryScreenState extends ConsumerState<AiStoryScreen> {
  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked == null) return;
    ref.read(_pickedPhotoProvider.notifier).state = File(picked.path);
    ref.read(storyResultProvider.notifier).clear();
  }

  Future<void> _generate() async {
    final photo = ref.read(_pickedPhotoProvider);
    if (photo == null) return;
    await ref.read(storyResultProvider.notifier).generate(widget.taskId, photo.path);
  }

  Future<void> _copy(String text, String label) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label copied')));
  }

  @override
  Widget build(BuildContext context) {
    final photo = ref.watch(_pickedPhotoProvider);
    final result = ref.watch(storyResultProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Create a story')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Pick a photo from today and we\'ll turn it into a story-ready image with a caption and hashtags. '
                'Edit anything before you post it.',
                style: TextStyle(fontSize: 13, color: AppColors.slate500),
              ),
              const SizedBox(height: 16),
              _PhotoPicker(photo: photo, onPick: _pickImage),
              const SizedBox(height: 16),
              LoadingButton(
                label: result.value == null ? 'Compose my story' : 'Compose again',
                isLoading: result.isLoading,
                onPressed: photo != null ? _generate : null,
              ),
              _StoryResultView(state: result, onCopy: _copy),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({required this.photo, required this.onPick});

  final File? photo;
  final Future<void> Function(ImageSource source) onPick;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (photo != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(photo!, height: 220, width: double.infinity, fit: BoxFit.cover),
          )
        else
          Container(
            height: 160,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.slate200),
            ),
            alignment: Alignment.center,
            child: const Text('No photo selected yet', style: TextStyle(color: AppColors.slate500, fontSize: 13)),
          ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => onPick(ImageSource.camera),
                icon: const Icon(Icons.photo_camera_outlined, size: 18),
                label: const Text('Camera'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => onPick(ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined, size: 18),
                label: const Text('Gallery'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StoryResultView extends StatelessWidget {
  const _StoryResultView({required this.state, required this.onCopy});

  final AsyncValue<StoryResultModel?> state;
  final Future<void> Function(String text, String label) onCopy;

  @override
  Widget build(BuildContext context) {
    if (state.hasError && !state.isLoading) {
      return Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
          child: Text(state.error.toString(), style: const TextStyle(color: AppColors.danger, fontSize: 13)),
        ),
      );
    }

    final result = state.value;
    if (result == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Your story', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 1080 / 1920,
              child: CachedNetworkImage(
                imageUrl: result.imageUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                errorWidget: (context, url, error) => const Center(
                  child: Icon(Icons.broken_image_outlined, color: AppColors.slate500),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (result.caption.isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.slate200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(result.caption, style: const TextStyle(fontSize: 14, height: 1.4)),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => onCopy(result.caption, 'Caption'),
                      icon: const Icon(Icons.copy_rounded, size: 16),
                      label: const Text('Copy caption'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (result.hashtags.isNotEmpty)
            Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [for (final tag in result.hashtags) Chip(label: Text(tag))],
                  ),
                ),
                IconButton(
                  tooltip: 'Copy hashtags',
                  onPressed: () => onCopy(result.hashtags.join(' '), 'Hashtags'),
                  icon: const Icon(Icons.copy_rounded, size: 18),
                ),
              ],
            ),
          const SizedBox(height: 8),
          const Text(
            'Save the image, then post it wherever this task needs it — Instagram, Facebook or WhatsApp Status.',
            style: TextStyle(fontSize: 12, color: AppColors.slate500),
          ),
        ],
      ),
    );
  }
}
