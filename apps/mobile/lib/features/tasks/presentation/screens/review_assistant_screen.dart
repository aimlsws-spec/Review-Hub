import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../data/models/review_draft_models.dart';
import '../../providers/review_assistant_providers.dart';
import '../widgets/honest_feedback_notice.dart';

/// Helps someone put their own visit into words. They say how it went, what was good and what could be better, and
/// get a few drafts to edit. It never decides the tone for them and never adds a recommendation they did not give.
///
/// Pops with the chosen draft (already copied to the clipboard), or with nothing if they leave without one.
class ReviewAssistantScreen extends ConsumerStatefulWidget {
  const ReviewAssistantScreen({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<ReviewAssistantScreen> createState() => _ReviewAssistantScreenState();
}

class _ReviewAssistantScreenState extends ConsumerState<ReviewAssistantScreen> {
  // The only reason this is a stateful widget: the text field's controller has to be disposed with the screen.
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _generate() =>
      ref.read(reviewDraftsProvider.notifier).generate(widget.taskId, notes: _notesController.text);

  Future<void> _useDraft(String draft) async {
    await Clipboard.setData(ClipboardData(text: draft));
    if (mounted) context.pop(draft);
  }

  Future<void> _copyDraft(String draft) async {
    await Clipboard.setData(ClipboardData(text: draft));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied')));
  }

  @override
  Widget build(BuildContext context) {
    final answers = ref.watch(reviewAnswersProvider);
    final drafts = ref.watch(reviewDraftsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Help me write my review')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const HonestFeedbackNotice(),
              const SizedBox(height: 20),
              const _ExperienceQuestion(),
              const SizedBox(height: 20),
              const _AspectQuestion(title: 'What was good?', subtitle: 'Optional', list: ReviewAspectList.liked),
              const SizedBox(height: 20),
              const _AspectQuestion(
                title: 'What could be better?',
                subtitle: 'Optional',
                list: ReviewAspectList.improve,
              ),
              const SizedBox(height: 20),
              const _RecommendQuestion(),
              const SizedBox(height: 20),
              TextField(
                controller: _notesController,
                maxLines: 3,
                maxLength: 300,
                decoration: const InputDecoration(
                  labelText: 'Anything else you want to say? (optional)',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 8),
              LoadingButton(
                label: drafts.value == null ? 'Write drafts for me' : 'Write different drafts',
                isLoading: drafts.isLoading,
                onPressed: answers.isReady ? _generate : null,
              ),
              if (!answers.isReady)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Tell us how your visit was overall to continue.',
                    style: TextStyle(fontSize: 12, color: AppColors.slate500),
                  ),
                ),
              _DraftResults(state: drafts, onUse: _useDraft, onCopy: _copyDraft),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExperienceQuestion extends ConsumerWidget {
  const _ExperienceQuestion();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(reviewAnswersProvider.select((a) => a.experience));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('How was your visit overall?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final experience in ReviewExperience.values)
              ChoiceChip(
                label: Text(experience.label),
                selected: selected == experience,
                onSelected: (_) => ref.read(reviewAnswersProvider.notifier).setExperience(experience),
              ),
          ],
        ),
      ],
    );
  }
}

class _AspectQuestion extends ConsumerWidget {
  const _AspectQuestion({required this.title, required this.subtitle, required this.list});

  final String title;
  final String subtitle;
  final ReviewAspectList list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(
      reviewAnswersProvider.select((a) => list == ReviewAspectList.liked ? a.liked : a.improve),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(width: 6),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final aspect in ReviewAspect.values)
              FilterChip(
                label: Text(aspect.label),
                selected: selected.contains(aspect),
                onSelected: (_) => ref.read(reviewAnswersProvider.notifier).toggleAspect(list, aspect),
              ),
          ],
        ),
      ],
    );
  }
}

class _RecommendQuestion extends ConsumerWidget {
  const _RecommendQuestion();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(reviewAnswersProvider.select((a) => a.recommend));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Would you recommend it to others?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text(
          'Only say yes or no if you want it in your review.',
          style: TextStyle(fontSize: 12, color: AppColors.slate500),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            for (final choice in RecommendChoice.values)
              ChoiceChip(
                label: Text(choice.label),
                selected: selected == choice,
                onSelected: (_) => ref.read(reviewAnswersProvider.notifier).setRecommend(choice),
              ),
          ],
        ),
      ],
    );
  }
}

class _DraftResults extends StatelessWidget {
  const _DraftResults({required this.state, required this.onUse, required this.onCopy});

  final AsyncValue<ReviewDraftsModel?> state;
  final Future<void> Function(String draft) onUse;
  final Future<void> Function(String draft) onCopy;

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

    final drafts = state.value?.drafts ?? const <String>[];
    if (drafts.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Pick one and make it yours', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          const Text(
            'These come only from your answers. Change anything that does not sound like you.',
            style: TextStyle(fontSize: 12, color: AppColors.slate500),
          ),
          const SizedBox(height: 10),
          for (final draft in drafts) _DraftCard(draft: draft, onUse: () => onUse(draft), onCopy: () => onCopy(draft)),
        ],
      ),
    );
  }
}

class _DraftCard extends StatelessWidget {
  const _DraftCard({required this.draft, required this.onUse, required this.onCopy});

  final String draft;
  final VoidCallback onUse;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.slate50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(draft, style: const TextStyle(fontSize: 14, height: 1.4)),
          const SizedBox(height: 4),
          Row(
            children: [
              TextButton.icon(onPressed: onUse, icon: const Icon(Icons.check, size: 16), label: const Text('Use this')),
              TextButton.icon(
                onPressed: onCopy,
                icon: const Icon(Icons.copy_rounded, size: 16),
                label: const Text('Copy'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
