import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/shared/widgets/app_badge.dart';

void main() {
  group('AppBadge', () {
    testWidgets('renders the given label', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: AppBadge(label: 'Custom label'))),
      );

      expect(find.text('Custom label'), findsOneWidget);
    });

    testWidgets('AppBadge.forStatus humanizes an underscored status', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: AppBadge.forStatus('PENDING_MANUAL'))),
      );

      expect(find.text('PENDING MANUAL'), findsOneWidget);
    });

    testWidgets('AppBadge.forStatus falls back to gray for an unmapped status', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: AppBadge.forStatus('SOME_UNKNOWN_STATUS'))),
      );

      expect(find.text('SOME UNKNOWN STATUS'), findsOneWidget);
    });
  });
}
