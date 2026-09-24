import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/story_result_model.dart';
import 'task_providers.dart';

/// The composed story for the current photo. Only asked for when the person picks a photo and taps
/// generate, never automatically — page-scoped, gone when the screen closes.
final storyResultProvider = AsyncNotifierProvider.autoDispose<StoryResultNotifier, StoryResultModel?>(
  StoryResultNotifier.new,
);

class StoryResultNotifier extends AsyncNotifier<StoryResultModel?> {
  @override
  Future<StoryResultModel?> build() async => null;

  Future<void> generate(String taskId, String photoPath) async {
    state = const AsyncLoading();
    final result = await ref.read(taskRepositoryProvider).composeStory(taskId, photoPath);
    state = result.when(
      success: AsyncData.new,
      failure: (failure) => AsyncError(
        failure.message.isEmpty ? 'Could not compose a story right now. Try again in a moment.' : failure.message,
        StackTrace.current,
      ),
    );
  }

  void clear() => state = const AsyncData(null);
}
