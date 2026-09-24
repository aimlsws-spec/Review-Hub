import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/config/app_config.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/tasks/data/models/story_result_model.dart';
import 'package:viral_kar/features/tasks/data/task_repository.dart';
import 'package:viral_kar/features/tasks/providers/story_providers.dart';
import 'package:viral_kar/features/tasks/providers/task_providers.dart';

/// Stands in for the network: returns what the test sets and records what it was asked.
class _FakeTaskRepository extends Fake implements TaskRepository {
  Result<StoryResultModel> result = const Result.success(
    StoryResultModel(imageUrl: 'http://localhost:3000/uploads/stories/uuid.jpg', caption: 'Great!', hashtags: ['#ViralKar']),
  );
  final List<({String taskId, String photoPath})> requests = [];

  @override
  Future<Result<StoryResultModel>> composeStory(String taskId, String photoPath) async {
    requests.add((taskId: taskId, photoPath: photoPath));
    return result;
  }
}

void main() {
  group('AppConfig.resolveUploadUrl', () {
    test('prefixes a relative path with the server origin, not the /api/v1 prefix', () {
      expect(AppConfig.resolveUploadUrl('/stories/uuid.jpg'), 'http://localhost:3000/uploads/stories/uuid.jpg');
    });

    test('adds a leading slash if the relative path is missing one', () {
      expect(AppConfig.resolveUploadUrl('stories/uuid.jpg'), 'http://localhost:3000/uploads/stories/uuid.jpg');
    });

    test('leaves an already-absolute URL untouched', () {
      expect(AppConfig.resolveUploadUrl('https://cdn.example.com/x.jpg'), 'https://cdn.example.com/x.jpg');
    });
  });

  group('StoryResultModel.fromJson', () {
    test('reads the caption and hashtags, and resolves imageUrl to a loadable URL', () {
      final model = StoryResultModel.fromJson({
        'imageUrl': '/stories/uuid.jpg',
        'caption': 'Loved it!',
        'hashtags': ['#Great', '#ViralKar'],
      });

      expect(model.imageUrl, 'http://localhost:3000/uploads/stories/uuid.jpg');
      expect(model.caption, 'Loved it!');
      expect(model.hashtags, ['#Great', '#ViralKar']);
    });

    test('survives missing and malformed data', () {
      final model = StoryResultModel.fromJson({});
      // A missing imageUrl still resolves through AppConfig.resolveUploadUrl (empty path in, base
      // uploads URL out) rather than crashing — CachedNetworkImage's errorWidget covers the rest.
      expect(model.imageUrl, 'http://localhost:3000/uploads/');
      expect(model.caption, '');
      expect(model.hashtags, isEmpty);

      expect(StoryResultModel.fromJson({'hashtags': 'nope'}).hashtags, isEmpty);
      expect(
        StoryResultModel.fromJson({
          'hashtags': ['', '  ', 7, null, '#Real'],
        }).hashtags,
        ['#Real'],
      );
    });
  });

  group('StoryResultNotifier', () {
    late _FakeTaskRepository repository;
    late ProviderContainer container;

    setUp(() {
      repository = _FakeTaskRepository();
      container = ProviderContainer(overrides: [taskRepositoryProvider.overrideWithValue(repository)]);
      addTearDown(container.dispose);
      container.listen(storyResultProvider, (_, _) {});
    });

    test('starts with nothing composed', () {
      expect(container.read(storyResultProvider).value, isNull);
    });

    test('sends the taskId and photo path, and stores the composed result', () async {
      await container.read(storyResultProvider.notifier).generate('task-1', '/local/photo.jpg');

      expect(repository.requests, hasLength(1));
      expect(repository.requests.single.taskId, 'task-1');
      expect(repository.requests.single.photoPath, '/local/photo.jpg');
      expect(container.read(storyResultProvider).value?.caption, 'Great!');
    });

    test('surfaces a failure message instead of throwing', () async {
      repository.result = const Result.failure(NetworkFailure('No connection'));

      await container.read(storyResultProvider.notifier).generate('task-1', '/local/photo.jpg');

      final state = container.read(storyResultProvider);
      expect(state.hasError, isTrue);
      expect(state.error.toString(), 'No connection');
    });

    test('clear() resets to no result, e.g. when a new photo is picked', () async {
      await container.read(storyResultProvider.notifier).generate('task-1', '/local/photo.jpg');
      expect(container.read(storyResultProvider).value, isNotNull);

      container.read(storyResultProvider.notifier).clear();

      expect(container.read(storyResultProvider).value, isNull);
    });
  });
}
