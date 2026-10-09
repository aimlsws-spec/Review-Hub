import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/app_status/providers/app_status_providers.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_task_model.dart';
import 'package:viral_kar/features/tasks/presentation/widgets/task_link_button.dart';

CampaignTaskModel _task({String taskType = 'INSTAGRAM_FOLLOW', Object? targetUrl}) => CampaignTaskModel(
  id: 'task-1',
  campaignId: 'campaign-1',
  title: 'Follow Prerna Cafe',
  taskType: taskType,
  verificationType: 'MANUAL',
  configuration: targetUrl == null ? null : {'targetUrl': targetUrl},
);

Future<List<Uri>> _pumpButton(WidgetTester tester, CampaignTaskModel task, {bool opens = true}) async {
  final opened = <Uri>[];
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        urlOpenerProvider.overrideWithValue((uri) async {
          opened.add(uri);
          return opens;
        }),
      ],
      child: MaterialApp(
        home: Scaffold(body: TaskLinkButton(task: task)),
      ),
    ),
  );
  return opened;
}

void main() {
  group('the link a task sends people to', () {
    test('uses an https link and names its site', () {
      final task = _task(targetUrl: ' https://www.instagram.com/prernatestcafe/ ');
      expect(task.targetUri, Uri.parse('https://www.instagram.com/prernatestcafe/'));
      expect(task.targetSiteName, 'Instagram');
      expect(_task(taskType: 'GOOGLE_REVIEW').targetSiteName, 'Google');
      expect(_task(taskType: 'SCREENSHOT').targetSiteName, isNull);
    });

    test('ignores a missing link and anything that is not https', () {
      expect(_task().targetUri, isNull);
      expect(_task(targetUrl: 'http://instagram.com/prernatestcafe').targetUri, isNull);
      expect(_task(targetUrl: 'javascript:alert(1)').targetUri, isNull);
      expect(_task(targetUrl: 42).targetUri, isNull);
    });
  });

  group('TaskLinkButton', () {
    testWidgets('opens the merchant link from a button named after the site', (tester) async {
      final opened = await _pumpButton(tester, _task(targetUrl: 'https://www.instagram.com/prernatestcafe/'));

      expect(find.text('www.instagram.com'), findsOneWidget);
      await tester.tap(find.text('Open on Instagram'));
      await tester.pump();

      expect(opened, [Uri.parse('https://www.instagram.com/prernatestcafe/')]);
    });

    testWidgets('says "Open link" for a task that may link anywhere', (tester) async {
      await _pumpButton(tester, _task(taskType: 'SCREENSHOT', targetUrl: 'https://prernacafe.in/menu'));
      expect(find.text('Open link'), findsOneWidget);
    });

    testWidgets('tells the person when the phone could not open it', (tester) async {
      await _pumpButton(tester, _task(targetUrl: 'https://www.instagram.com/prernatestcafe/'), opens: false);

      await tester.tap(find.text('Open on Instagram'));
      await tester.pump();

      expect(find.textContaining('Could not open the link'), findsOneWidget);
    });

    testWidgets('shows nothing when the task has no link', (tester) async {
      await _pumpButton(tester, _task());
      expect(find.byType(OutlinedButton), findsNothing);
    });
  });
}
