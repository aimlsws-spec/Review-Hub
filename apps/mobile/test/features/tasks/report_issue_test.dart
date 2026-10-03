import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/tasks/data/task_repository.dart';
import 'package:viral_kar/features/tasks/presentation/screens/task_detail_screen.dart';
import 'package:viral_kar/features/tasks/presentation/widgets/report_issue_sheet.dart';
import 'package:viral_kar/features/tasks/providers/task_providers.dart';

class _FakeTaskRepository extends Fake implements TaskRepository {
  final List<(String, String)> reports = [];
  Result<void> answer = const Result.success(null);

  @override
  Future<Result<void>> reportIssue(String taskId, String description) async {
    reports.add((taskId, description));
    return answer;
  }
}

void main() {
  group('completionLimitLabel', () {
    test('reads naturally for each period', () {
      expect(completionLimitLabel('DAILY', 1), 'Once a day');
      expect(completionLimitLabel('WEEKLY', 3), '3 times a week');
      expect(completionLimitLabel('MONTHLY', 1), 'Once a month');
    });

    test('says nothing for a once-only task or an unknown value', () {
      expect(completionLimitLabel('ONCE', 1), '');
      expect(completionLimitLabel('HOURLY', 2), '');
    });
  });

  group('ReportIssueSheet', () {
    Future<(_FakeTaskRepository, List<bool>)> open(WidgetTester tester) async {
      final repository = _FakeTaskRepository();
      final results = <bool>[];
      await tester.pumpWidget(
        ProviderScope(
          overrides: [taskRepositoryProvider.overrideWithValue(repository)],
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () async => results.add(await showReportIssueSheet(context, 'task-1')),
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      return (repository, results);
    }

    testWidgets('asks for enough detail before sending anything', (tester) async {
      final (repository, _) = await open(tester);

      await tester.enterText(find.byKey(const Key('issueDescription')), 'broken');
      await tester.tap(find.text('Send report'));
      await tester.pumpAndSettle();

      expect(find.textContaining('a little more detail'), findsOneWidget);
      expect(repository.reports, isEmpty);
    });

    testWidgets('sends the report for this task and closes, telling the caller it was sent', (tester) async {
      final (repository, results) = await open(tester);

      await tester.enterText(find.byKey(const Key('issueDescription')), '  The app link in the task is broken.  ');
      await tester.tap(find.text('Send report'));
      await tester.pumpAndSettle();

      expect(repository.reports, [('task-1', 'The app link in the task is broken.')]);
      expect(results, [true]);
      expect(find.text('Report an issue'), findsNothing);
    });

    testWidgets('stays open and shows why when sending fails', (tester) async {
      final (repository, results) = await open(tester);
      repository.answer = const Result.failure(ServerFailure('Support is unavailable right now.'));

      await tester.enterText(find.byKey(const Key('issueDescription')), 'The app link in the task is broken.');
      await tester.tap(find.text('Send report'));
      await tester.pumpAndSettle();

      expect(find.text('Support is unavailable right now.'), findsOneWidget);
      expect(results, isEmpty);
    });
  });
}
