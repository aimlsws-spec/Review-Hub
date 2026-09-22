import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_task_model.dart';
import 'package:viral_kar/features/tasks/data/models/review_draft_models.dart';
import 'package:viral_kar/features/tasks/data/task_repository.dart';
import 'package:viral_kar/features/tasks/presentation/screens/review_assistant_screen.dart';
import 'package:viral_kar/features/tasks/presentation/widgets/honest_feedback_notice.dart';
import 'package:viral_kar/features/tasks/providers/review_assistant_providers.dart';
import 'package:viral_kar/features/tasks/providers/task_providers.dart';

/// Stands in for the network: returns what the test sets and records what it was asked.
class _FakeTaskRepository extends Fake implements TaskRepository {
  Result<ReviewDraftsModel> result = const Result.success(
    ReviewDraftsModel(drafts: ['Draft one.', 'Draft two.'], source: 'template'),
  );
  final List<({String taskId, Map<String, dynamic> body})> requests = [];

  @override
  Future<Result<ReviewDraftsModel>> getReviewDrafts(String taskId, ReviewAnswers answers, {String notes = ''}) async {
    requests.add((taskId: taskId, body: answers.toRequestBody(notes: notes)));
    return result;
  }
}

CampaignTaskModel _task(String type) =>
    CampaignTaskModel(id: 't1', campaignId: 'c1', title: 'Review us', taskType: type, verificationType: 'MANUAL');

void main() {
  group('ReviewAnswers', () {
    test('starts with nothing answered, and is not ready until the overall experience is given', () {
      const answers = ReviewAnswers();

      expect(answers.isReady, isFalse);
      expect(answers.toRequestBody(), isEmpty);
      expect(answers.copyWith(experience: ReviewExperience.mixed).isReady, isTrue);
    });

    test('sends only what was answered, in a stable order, using the API names', () {
      final body = const ReviewAnswers(
        liked: {ReviewAspect.service, ReviewAspect.food},
        improve: {ReviewAspect.price},
        experience: ReviewExperience.mixed,
        recommend: RecommendChoice.no,
      ).toRequestBody(notes: '  Long wait.  ');

      expect(body, {
        'likedAspects': ['FOOD', 'SERVICE'],
        'improveAspects': ['PRICE'],
        'experience': 'MIXED',
        'wouldRecommend': false,
        'notes': 'Long wait.',
      });
    });

    test('leaves the recommendation out when the person did not say', () {
      final body = const ReviewAnswers(experience: ReviewExperience.positive).toRequestBody();

      expect(body.containsKey('wouldRecommend'), isFalse);
      expect(body, {'experience': 'POSITIVE'});
    });

    test('sends a yes as true', () {
      expect(
        const ReviewAnswers(
          experience: ReviewExperience.positive,
          recommend: RecommendChoice.yes,
        ).toRequestBody()['wouldRecommend'],
        isTrue,
      );
    });
  });

  group('ReviewDraftsModel.fromJson', () {
    test('reads the drafts and where they came from', () {
      final model = ReviewDraftsModel.fromJson({
        'drafts': ['  A. ', 'B.'],
        'source': 'llm',
      });

      expect(model.drafts, ['A.', 'B.']);
      expect(model.source, 'llm');
    });

    test('survives missing, malformed and blank data', () {
      expect(ReviewDraftsModel.fromJson({}).drafts, isEmpty);
      expect(ReviewDraftsModel.fromJson({'drafts': 'nope'}).drafts, isEmpty);
      expect(
        ReviewDraftsModel.fromJson({
          'drafts': ['', '   ', 7, null, 'Real.'],
        }).drafts,
        ['Real.'],
      );
      expect(ReviewDraftsModel.fromJson({}).source, 'template');
    });
  });

  group('review task detection', () {
    test('only Google and Play Store reviews count as review tasks', () {
      expect(_task('GOOGLE_REVIEW').isReviewTask, isTrue);
      expect(_task('PLAY_STORE_REVIEW').isReviewTask, isTrue);
      expect(_task('INSTAGRAM_COMMENT').isReviewTask, isFalse);
      expect(_task('TEXT').isReviewTask, isFalse);
    });
  });

  group('ReviewAnswersNotifier', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
      addTearDown(container.dispose);
      container.listen(reviewAnswersProvider, (_, _) {});
    });

    ReviewAnswers read() => container.read(reviewAnswersProvider);
    ReviewAnswersNotifier notifier() => container.read(reviewAnswersProvider.notifier);

    test('an aspect can be picked and un-picked', () {
      notifier().toggleAspect(ReviewAspectList.liked, ReviewAspect.food);
      expect(read().liked, {ReviewAspect.food});

      notifier().toggleAspect(ReviewAspectList.liked, ReviewAspect.food);
      expect(read().liked, isEmpty);
    });

    test('an aspect is never both good and in need of improvement: the last choice wins', () {
      notifier().toggleAspect(ReviewAspectList.liked, ReviewAspect.service);
      notifier().toggleAspect(ReviewAspectList.improve, ReviewAspect.service);

      expect(read().liked, isEmpty);
      expect(read().improve, {ReviewAspect.service});

      notifier().toggleAspect(ReviewAspectList.liked, ReviewAspect.service);
      expect(read().improve, isEmpty);
      expect(read().liked, {ReviewAspect.service});
    });

    test('the recommendation starts as not saying, so nothing is said for the person', () {
      expect(read().recommend, RecommendChoice.notSaying);
      expect(read().experience, isNull);
    });
  });

  group('ReviewAssistantScreen', () {
    late _FakeTaskRepository repository;
    String? chosen;
    List<String> clipboard = [];

    Future<void> openScreen(WidgetTester tester) async {
      // Tall enough that the whole form is on screen, so taps do not depend on scrolling.
      tester.view.physicalSize = const Size(800, 3200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      // Copying to the clipboard goes through a platform channel, which a test has to answer itself.
      final copied = <String>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
        if (call.method == 'Clipboard.setData') copied.add((call.arguments as Map)['text'] as String);
        return null;
      });
      addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
      clipboard = copied;
      chosen = null;
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  onPressed: () async => chosen = await context.push<String>('/assist'),
                  child: const Text('open'),
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/assist',
            builder: (context, state) => const ReviewAssistantScreen(taskId: 'task-1'),
          ),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [taskRepositoryProvider.overrideWithValue(repository)],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
    }

    setUp(() => repository = _FakeTaskRepository());

    testWidgets('tells the person their reward never depends on the rating or the words', (tester) async {
      await openScreen(tester);

      expect(find.byType(HonestFeedbackNotice), findsOneWidget);
      expect(find.textContaining('good or bad'), findsOneWidget);
      expect(find.textContaining('never depends on your rating'), findsOneWidget);
    });

    testWidgets('does not offer to write anything until the overall experience is answered', (tester) async {
      await openScreen(tester);

      final button = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Write drafts for me'));
      expect(button.onPressed, isNull);
      expect(find.textContaining('how your visit was overall'), findsOneWidget);
    });

    testWidgets('asks what could be better, not only what was good', (tester) async {
      await openScreen(tester);

      expect(find.text('What was good?'), findsOneWidget);
      expect(find.text('What could be better?'), findsOneWidget);
      expect(find.text('Prefer not to say'), findsOneWidget);
    });

    testWidgets('sends exactly the answers given, and shows the drafts', (tester) async {
      await openScreen(tester);

      await tester.tap(find.widgetWithText(ChoiceChip, 'Mixed'));
      await tester.pump();
      await tester.tap(find.descendant(of: find.byType(Wrap).at(1), matching: find.text('Food')));
      await tester.tap(find.descendant(of: find.byType(Wrap).at(2), matching: find.text('Price')));
      await tester.pump();
      await tester.tap(find.text('Write drafts for me'));
      await tester.pumpAndSettle();

      expect(repository.requests, hasLength(1));
      expect(repository.requests.single.taskId, 'task-1');
      expect(repository.requests.single.body, {
        'likedAspects': ['FOOD'],
        'improveAspects': ['PRICE'],
        'experience': 'MIXED',
      });
      expect(find.text('Draft one.'), findsOneWidget);
      expect(find.text('Draft two.'), findsOneWidget);
    });

    testWidgets('returns the chosen draft to the task screen', (tester) async {
      await openScreen(tester);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Good'));
      await tester.pump();
      await tester.tap(find.text('Write drafts for me'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Draft two.'));
      await tester.tap(find.widgetWithText(TextButton, 'Use this').last);
      await tester.pumpAndSettle();

      expect(chosen, 'Draft two.');
      expect(clipboard, ['Draft two.']);
      expect(find.text('open'), findsOneWidget);
    });

    testWidgets('says so, and leaves the person free to write their own, when drafts fail', (tester) async {
      repository.result = const Result.failure(NetworkFailure('No connection'));
      await openScreen(tester);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Not good'));
      await tester.pump();

      await tester.tap(find.text('Write drafts for me'));
      await tester.pumpAndSettle();

      expect(find.text('No connection'), findsOneWidget);
      expect(find.text('Use this'), findsNothing);
    });

    testWidgets('says so when the server sends back no drafts at all', (tester) async {
      repository.result = const Result.success(ReviewDraftsModel(drafts: [], source: 'llm'));
      await openScreen(tester);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Good'));
      await tester.pump();

      await tester.tap(find.text('Write drafts for me'));
      await tester.pumpAndSettle();

      expect(find.textContaining('could not write a draft'), findsOneWidget);
    });
  });
}
