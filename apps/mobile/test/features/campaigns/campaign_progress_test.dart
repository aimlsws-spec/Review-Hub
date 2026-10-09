import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_progress_model.dart';
import 'package:viral_kar/features/campaigns/presentation/screens/my_campaigns_screen.dart';
import 'package:viral_kar/features/campaigns/presentation/widgets/task_progress_badge.dart';
import 'package:viral_kar/features/campaigns/providers/campaign_providers.dart';
import 'package:viral_kar/shared/models/api_response.dart';

void main() {
  group('campaign progress from the server', () {
    test('reads each task state, and which tasks this person has finished', () {
      final progress = CampaignProgressModel.fromJson({
        'campaignId': 'campaign-1',
        'joined': true,
        'allDone': false,
        'tasks': [
          {'taskId': 'task-follow', 'state': 'COMPLETED', 'availableAgainAt': null, 'timesCompleted': 1},
          {'taskId': 'task-review', 'state': 'IN_REVIEW', 'availableAgainAt': null, 'timesCompleted': 0},
          {
            'taskId': 'task-daily',
            'state': 'LIMIT_REACHED',
            'availableAgainAt': '2026-10-09T18:30:00.000Z',
            'timesCompleted': 3,
          },
        ],
      });

      expect(progress.forTask('task-follow')!.state, TaskProgressState.completed);
      expect(progress.forTask('task-follow')!.canStart, isFalse);
      expect(progress.forTask('task-review')!.state, TaskProgressState.inReview);
      expect(progress.forTask('task-daily')!.availableAgainAt, DateTime.utc(2026, 10, 9, 18, 30));
      expect(progress.forTask('task-unknown'), isNull);
    });

    test('treats a state this app does not know as available, leaving the server to refuse', () {
      final task = TaskProgressModel.fromJson({'taskId': 'task-1', 'state': 'SOMETHING_NEW'});
      expect(task.state, TaskProgressState.available);
      expect(task.canStart, isTrue);
    });
  });

  group('task progress badge', () {
    test('names each state in plain words', () {
      expect(taskProgressLabel(const TaskProgressModel(taskId: 't', state: TaskProgressState.completed)), 'Completed');
      expect(taskProgressLabel(const TaskProgressModel(taskId: 't', state: TaskProgressState.inReview)), 'In review');
      expect(
        taskProgressLabel(
          TaskProgressModel(
            taskId: 't',
            state: TaskProgressState.limitReached,
            availableAgainAt: DateTime(2026, 10, 10, 9),
          ),
        ),
        startsWith('Available again 10 Oct'),
      );
    });

    testWidgets('shows nothing for a task that can still be done', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskProgressBadge(progress: TaskProgressModel(taskId: 't')),
          ),
        ),
      );
      expect(find.byType(Text), findsNothing);
    });

    testWidgets('marks a finished task as completed', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TaskProgressBadge(
              progress: TaskProgressModel(taskId: 't', state: TaskProgressState.completed),
            ),
          ),
        ),
      );
      expect(find.text('Completed'), findsOneWidget);
    });
  });

  group('My campaigns', () {
    PaginatedResponse<JoinedCampaignModel> pageOf(List<JoinedCampaignModel> items) =>
        PaginatedResponse(items: items, total: items.length, page: 1, limit: 20);

    Future<void> pumpScreen(WidgetTester tester, JoinedCampaignFilter initialFilter) {
      return tester.pumpWidget(
        ProviderScope(
          overrides: [
            joinedCampaignsProvider(JoinedCampaignFilter.completed).overrideWith(
              (ref) async => Result.success(
                pageOf([
                  JoinedCampaignModel(
                    campaignId: 'campaign-1',
                    title: 'Like Our Diwali Post',
                    businessName: 'Prerna Test Cafe',
                    tasksCompleted: 1,
                    tasksTotal: 1,
                    completedAt: DateTime(2026, 10, 9, 12),
                    earned: 10,
                  ),
                ]),
              ),
            ),
            joinedCampaignsProvider(
              JoinedCampaignFilter.inProgress,
            ).overrideWith((ref) async => Result.success(pageOf([]))),
          ],
          child: MaterialApp(home: MyCampaignsScreen(initialFilter: initialFilter)),
        ),
      );
    }

    testWidgets('lists the completed campaigns with what each earned', (tester) async {
      await pumpScreen(tester, JoinedCampaignFilter.completed);
      await tester.pumpAndSettle();

      expect(find.text('Like Our Diwali Post'), findsOneWidget);
      expect(find.text('Prerna Test Cafe'), findsOneWidget);
      expect(find.text('₹10'), findsOneWidget);
      expect(find.textContaining('1 of 1 tasks done'), findsOneWidget);
      expect(find.textContaining('Completed 9 Oct 2026'), findsOneWidget);
    });

    testWidgets('says when nothing is in progress', (tester) async {
      await pumpScreen(tester, JoinedCampaignFilter.inProgress);
      await tester.pumpAndSettle();

      expect(find.text('Nothing in progress'), findsOneWidget);
    });
  });
}
