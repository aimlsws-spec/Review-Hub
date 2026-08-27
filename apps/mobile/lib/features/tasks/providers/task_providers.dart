import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/task_submission_model.dart';
import '../data/models/text_suggestion_model.dart';
import '../data/task_repository.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(ref.watch(dioProvider));
});

/// Bumped after a successful submission so [mySubmissionsProvider] refetches.
final submissionsRefreshProvider = StateProvider<int>((ref) => 0);

final mySubmissionsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<TaskSubmissionModel>>>((ref) async {
  ref.watch(submissionsRefreshProvider);
  return ref.watch(taskRepositoryProvider).listMySubmissions();
});

/// Fetched on demand (via `ref.refresh`) when the user taps "Suggest text" —
/// not auto-run on screen load, since it's an optional assist, not required data.
final textSuggestionProvider =
    FutureProvider.autoDispose.family<Result<TextSuggestionModel>, String>((ref, taskId) async {
  return ref.watch(taskRepositoryProvider).getTextSuggestion(taskId);
});
