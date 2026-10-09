import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_model.dart';
import 'package:viral_kar/features/campaigns/presentation/widgets/campaign_card_compact.dart';
import 'package:viral_kar/features/dashboard/presentation/screens/home_screen.dart';
import 'package:viral_kar/features/tasks/data/models/recommended_task_model.dart';
import 'package:viral_kar/features/tasks/presentation/widgets/recommended_task_card.dart';

const _campaign = CampaignModel(
  id: 'campaign-1',
  title: 'Weekend Feedback at Prerna Test Cafe',
  slug: 'weekend-feedback',
  description: 'Share your honest experience.',
  campaignType: 'REVIEW',
  status: 'ACTIVE',
  rewardType: 'CASH',
  rewardAmount: '40.00',
);

const _task = RecommendedTaskModel(
  taskId: 'task-1',
  campaignId: 'campaign-1',
  title: 'Follow @prernatestcafe on Instagram',
  campaignTitle: 'Follow Prerna Cafe',
  rewardAmount: '1000.00',
  minimumTimeSeconds: 60,
  isHighReward: true,
  isQuickTask: true,
);

/// A card inside a row as tall as the home screen makes it, at the given system text size.
Future<void> pumpInRow(
  WidgetTester tester, {
  required double textScale,
  required double textBlockHeight,
  required Widget card,
}) {
  return tester.pumpWidget(
    MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
        child: Scaffold(
          body: Builder(
            builder: (context) => SizedBox(
              height: homeCarouselHeight(context, textBlockHeight: textBlockHeight),
              child: ListView(scrollDirection: Axis.horizontal, children: [card]),
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  // 1.0 is the default; 1.3 and 2.0 are common "large" and the largest Android font size settings.
  for (final textScale in [1.0, 1.3, 2.0]) {
    testWidgets('a popular campaign card fits its row at text size $textScale', (tester) async {
      await pumpInRow(
        tester,
        textScale: textScale,
        textBlockHeight: 58,
        card: CampaignCardCompact(campaign: _campaign, onTap: () {}),
      );

      expect(tester.takeException(), isNull);
      expect(find.text('₹40'), findsOneWidget);
    });

    testWidgets('a recommended task card with both badges fits its row at text size $textScale', (tester) async {
      await pumpInRow(
        tester,
        textScale: textScale,
        textBlockHeight: 70,
        card: RecommendedTaskCard(task: _task, onTap: () {}),
      );

      expect(tester.takeException(), isNull);
      expect(find.text('₹1000'), findsOneWidget);
      expect(find.text('High Reward'), findsOneWidget);
    });
  }

  testWidgets('the row grows with the text size', (tester) async {
    final heights = <double>[];
    for (final textScale in [1.0, 2.0]) {
      await tester.pumpWidget(
        MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
          child: Builder(
            builder: (context) {
              heights.add(homeCarouselHeight(context, textBlockHeight: 58));
              return const SizedBox.shrink();
            },
          ),
        ),
      );
    }
    expect(heights, [148, 206]);
  });
}
