import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/gamification/data/models/gamification_profile_model.dart';
import 'package:viral_kar/features/gamification/presentation/widgets/tier_badge.dart';

void main() {
  Map<String, dynamic> json([Map<String, dynamic> extra = const {}]) => {
    'id': 'p-1',
    'userId': 'u-1',
    'level': 6,
    'xp': 2600,
    ...extra,
  };

  test('reads the tier and the way to the next one', () {
    final profile = GamificationProfileModel.fromJson(
      json({'tier': 'SILVER', 'nextTier': 'GOLD', 'xpToNextTier': 5500, 'progressPercent': 15}),
    );

    expect(profile.tier, GamificationTier.silver);
    expect(profile.nextTier, GamificationTier.gold);
    expect(profile.xpToNextTier, 5500);
    expect(profile.progressPercent, 15);
  });

  test('has no next tier at the top, and falls back to Bronze for an older server', () {
    final top = GamificationProfileModel.fromJson(json({'tier': 'PLATINUM', 'nextTier': null, 'progressPercent': 100}));
    expect(top.nextTier, isNull);

    final old = GamificationProfileModel.fromJson(json());
    expect(old.tier, GamificationTier.bronze);
    expect(old.progressPercent, 0);
  });

  testWidgets('the badge shows the tier name', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: TierBadge(tier: GamificationTier.diamond)));

    expect(find.text('Diamond'), findsOneWidget);
  });
}
