import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:hive/hive.dart';
import 'package:viral_kar/core/constants/storage_keys.dart';
import 'package:viral_kar/core/router/route_paths.dart';
import 'package:viral_kar/features/permissions/presentation/screens/permissions_intro_screen.dart';
import 'package:viral_kar/features/permissions/providers/permissions_providers.dart';
import 'package:viral_kar/shared/providers/core_providers.dart';

void main() {
  late Box box;

  setUp(() async {
    // In memory: a file write is real I/O, which never finishes inside a widget test's fake clock.
    box = await Hive.openBox('settings_test', bytes: Uint8List(0));
  });

  tearDown(() => box.close());

  Future<({List<String> asked})> open(WidgetTester tester, {bool locationAllowed = true}) async {
    final asked = <String>[];
    final router = GoRouter(
      initialLocation: RoutePaths.permissionsIntro,
      routes: [
        GoRoute(path: RoutePaths.permissionsIntro, builder: (context, state) => const PermissionsIntroScreen()),
        GoRoute(path: RoutePaths.home, builder: (context, state) => const Text('Home')),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          settingsBoxProvider.overrideWithValue(box),
          permissionPromptsProvider.overrideWithValue(
            PermissionPrompts(
              notifications: () async => asked.add('notifications'),
              location: () async {
                asked.add('location');
                return locationAllowed;
              },
            ),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
    return (asked: asked);
  }

  testWidgets('explains each permission before anything is asked', (tester) async {
    final result = await open(tester);

    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Location'), findsOneWidget);
    expect(find.text('Camera and photos'), findsOneWidget);
    expect(result.asked, isEmpty);
  });

  testWidgets('asks the phone only when the person taps Allow, and shows the outcome', (tester) async {
    final result = await open(tester, locationAllowed: false);

    await tester.tap(find.text('Allow').first);
    await tester.pumpAndSettle();
    expect(result.asked, ['notifications']);
    expect(find.byIcon(Icons.check_circle), findsOneWidget);

    await tester.tap(find.text('Allow'));
    await tester.pumpAndSettle();
    expect(result.asked, ['notifications', 'location']);
    expect(find.text('Later'), findsOneWidget);
  });

  testWidgets('continuing remembers the intro was seen and goes home', (tester) async {
    await open(tester);

    await tester.ensureVisible(find.text('Continue'));
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    expect(box.get(StorageKeys.permissionsIntroSeen), isTrue);
    expect(find.text('Home'), findsOneWidget);
  });
}
