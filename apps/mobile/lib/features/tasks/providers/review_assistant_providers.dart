import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/review_draft_models.dart';
import 'task_providers.dart';

/// Which of the two aspect lists a tap belongs to.
enum ReviewAspectList { liked, improve }

/// What the person has answered on the review assistant screen. Page-scoped: gone when the screen closes.
final reviewAnswersProvider = NotifierProvider.autoDispose<ReviewAnswersNotifier, ReviewAnswers>(
  ReviewAnswersNotifier.new,
);

class ReviewAnswersNotifier extends Notifier<ReviewAnswers> {
  @override
  ReviewAnswers build() => const ReviewAnswers();

  /// An aspect is either something they liked or something that could be better, never both, so choosing it in
  /// one list takes it out of the other.
  void toggleAspect(ReviewAspectList list, ReviewAspect aspect) {
    final current = list == ReviewAspectList.liked ? state.liked : state.improve;
    final other = list == ReviewAspectList.liked ? state.improve : state.liked;
    final next = current.contains(aspect) ? ({...current}..remove(aspect)) : {...current, aspect};
    final otherNext = {...other}..remove(aspect);

    state = list == ReviewAspectList.liked
        ? state.copyWith(liked: next, improve: otherNext)
        : state.copyWith(improve: next, liked: otherNext);
  }

  void setExperience(ReviewExperience experience) => state = state.copyWith(experience: experience);

  void setRecommend(RecommendChoice choice) => state = state.copyWith(recommend: choice);
}

/// The drafts for the current answers. Only asked for when the person taps the button, never on load.
final reviewDraftsProvider = AsyncNotifierProvider.autoDispose<ReviewDraftsNotifier, ReviewDraftsModel?>(
  ReviewDraftsNotifier.new,
);

class ReviewDraftsNotifier extends AsyncNotifier<ReviewDraftsModel?> {
  @override
  Future<ReviewDraftsModel?> build() async => null;

  Future<void> generate(String taskId, {String notes = ''}) async {
    final answers = ref.read(reviewAnswersProvider);
    if (!answers.isReady) return;

    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).getReviewDrafts(taskId, answers, notes: notes);
    state = result.when(
      success: (drafts) => drafts.drafts.isEmpty
          ? AsyncError('We could not write a draft this time. You can write your own instead.', StackTrace.current)
          : AsyncData(drafts),
      failure: (failure) => AsyncError(
        failure.message.isEmpty ? 'Could not get drafts right now. You can write your own instead.' : failure.message,
        StackTrace.current,
      ),
    );
  }
}
