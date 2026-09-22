import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/app_lock/data/app_lock_store.dart';
import 'package:viral_kar/features/app_lock/data/device_authenticator.dart';
import 'package:viral_kar/features/app_lock/presentation/screens/lock_screen.dart';
import 'package:viral_kar/features/app_lock/presentation/widgets/app_lock_gate.dart';
import 'package:viral_kar/features/app_lock/providers/app_lock_providers.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/features/settings/presentation/screens/settings_screen.dart';
import 'package:viral_kar/features/settings/providers/settings_providers.dart';

import '../../support/app_lifecycle.dart';

/// Stands in for the phone's prompt: answers with what the test sets, and records how often it was asked.
class _FakeAuthenticator implements DeviceAuthenticator {
  bool available = true;
  final List<DeviceAuthResult> results = [];
  final List<String> reasons = [];
  Completer<void>? hold;

  @override
  Future<bool> isAvailable() async => available;

  @override
  Future<DeviceAuthResult> authenticate(String reason) async {
    reasons.add(reason);
    await hold?.future;
    return results.isEmpty ? DeviceAuthResult.success : results.removeAt(0);
  }
}

class _MemoryStore implements AppLockStore {
  _MemoryStore();

  bool enabled = false;

  @override
  bool get isEnabled => enabled;

  @override
  Future<void> setEnabled(bool value) async => enabled = value;
}

const _user = UserModel(id: 'u1', firstName: 'Asha', lastName: 'Patel', status: 'ACTIVE');

/// A session the test controls, without going near the network.
class _FakeAuth extends AuthStateNotifier {
  _FakeAuth({this.signedIn = true});

  final bool signedIn;

  @override
  Future<UserModel?> build() async => signedIn ? _user : null;

  void signIn() => state = const AsyncData(_user);

  @override
  Future<void> logout() async => state = const AsyncData(null);
}

/// Lets time pass in small steps, for screens that never stop animating.
Future<void> _pumpFor(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  late _FakeAuthenticator phone;
  late _MemoryStore store;
  late DateTime now;

  setUp(() {
    phone = _FakeAuthenticator();
    store = _MemoryStore();
    now = DateTime(2026, 9, 21, 10);
  });

  Future<ProviderContainer> open(
    WidgetTester tester, {
    bool enabled = false,
    bool signedIn = true,
    Widget? home,
    bool settle = true,
  }) async {
    store.enabled = enabled;
    tester.view.physicalSize = const Size(800, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final container = ProviderContainer(
      overrides: [
        appLockStoreProvider.overrideWithValue(store),
        deviceAuthenticatorProvider.overrideWithValue(phone),
        appLockPromptDelayProvider.overrideWithValue(Duration.zero),
        appLockClockProvider.overrideWithValue(() => now),
        authStateProvider.overrideWith(() => _FakeAuth(signedIn: signedIn)),
        notificationPreferencesProvider.overrideWith((ref) => Completer<Never>().future),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          home: home ?? const AppLockGate(child: Scaffold(body: Text('The app'))),
        ),
      ),
    );
    // A screen with a spinner that never stops (Settings, while its preferences load) can not "settle".
    await (settle ? tester.pumpAndSettle() : _pumpFor(tester));
    return container;
  }

  AppLockNotifier notifierOf(ProviderContainer container) => container.read(appLockProvider.notifier);
  AppLockState stateOf(ProviderContainer container) => container.read(appLockProvider);

  group('the lock screen', () {
    testWidgets('does not appear, and the phone is never asked, when the app lock is off', (tester) async {
      await open(tester);

      expect(find.byType(LockScreen), findsNothing);
      expect(find.text('The app'), findsOneWidget);
      expect(phone.reasons, isEmpty);
    });

    testWidgets('covers the app from the first frame, asks the phone by itself, and opens once it says yes', (
      tester,
    ) async {
      final container = await open(tester, enabled: true);

      expect(phone.reasons, ['Unlock VIRAL KAR']);
      expect(find.byType(LockScreen), findsNothing);
      expect(stateOf(container).locked, isFalse);
      expect(find.text('The app'), findsOneWidget);
    });

    testWidgets('stays shut and says so when the fingerprint does not match, and opens on the next try', (
      tester,
    ) async {
      phone.results.add(DeviceAuthResult.failed);
      await open(tester, enabled: true);

      expect(find.byType(LockScreen), findsOneWidget);
      expect(find.text('That did not match. Please try again.'), findsOneWidget);

      await tester.tap(find.text('Unlock'));
      await tester.pumpAndSettle();

      expect(find.byType(LockScreen), findsNothing);
      expect(phone.reasons, hasLength(2));
    });

    testWidgets('stays shut, without an error, when the prompt is closed, and can be opened again', (tester) async {
      phone.results.add(DeviceAuthResult.canceled);
      await open(tester, enabled: true);

      expect(find.byType(LockScreen), findsOneWidget);
      expect(find.text('Use your fingerprint, face or screen lock to continue.'), findsOneWidget);
      expect(find.text('That did not match. Please try again.'), findsNothing);
    });

    testWidgets('always offers signing out, so a person who can not get in is not stuck', (tester) async {
      phone.results.add(DeviceAuthResult.failed);
      final container = await open(tester, enabled: true);

      await tester.tap(find.text('Sign out'));
      await tester.pumpAndSettle();

      expect(container.read(authStateProvider).value, isNull);
      expect(find.byType(LockScreen), findsNothing);
    });

    testWidgets(
      'drops the lock when the phone no longer has a screen lock to check against, instead of locking the owner out',
      (tester) async {
        phone.results.add(DeviceAuthResult.unavailable);
        final container = await open(tester, enabled: true);

        expect(find.byType(LockScreen), findsNothing);
        expect(stateOf(container).enabled, isFalse);
        expect(store.enabled, isFalse);
      },
    );

    testWidgets('does not cover someone who is not signed in: there is nothing of theirs to protect', (tester) async {
      await open(tester, enabled: true, signedIn: false);

      expect(find.byType(LockScreen), findsNothing);
      expect(find.text('The app'), findsOneWidget);
      expect(phone.reasons, isEmpty);
    });

    testWidgets('asks the phone once they sign in, if the app had started locked', (tester) async {
      phone.results.add(DeviceAuthResult.failed);
      final container = await open(tester, enabled: true, signedIn: false);

      (container.read(authStateProvider.notifier) as _FakeAuth).signIn();
      await tester.pumpAndSettle();

      expect(phone.reasons, ['Unlock VIRAL KAR']);
      expect(find.byType(LockScreen), findsOneWidget);
    });

    testWidgets('never opens the phone’s prompt twice at once', (tester) async {
      phone.hold = Completer<void>();
      final container = await open(tester, enabled: true);
      expect(phone.reasons, hasLength(1));

      unawaited(notifierOf(container).unlock());
      unawaited(notifierOf(container).unlock());
      await tester.pump();

      expect(phone.reasons, hasLength(1));
      phone.hold!.complete();
      await tester.pumpAndSettle();
    });
  });

  group('coming back to the app', () {
    testWidgets('does not lock for a short trip out of the app', (tester) async {
      final container = await open(tester, enabled: true);
      expect(stateOf(container).locked, isFalse);

      leaveApp(tester);
      now = now.add(const Duration(seconds: 10));
      returnToApp(tester);
      await tester.pumpAndSettle();

      expect(stateOf(container).locked, isFalse);
      expect(phone.reasons, hasLength(1));
    });

    testWidgets('locks after a real absence, and asks the phone again', (tester) async {
      final container = await open(tester, enabled: true);

      leaveApp(tester);
      now = now.add(const Duration(seconds: 31));
      phone.results.add(DeviceAuthResult.canceled);
      returnToApp(tester);
      await tester.pumpAndSettle();

      expect(stateOf(container).locked, isTrue);
      expect(find.byType(LockScreen), findsOneWidget);
      expect(phone.reasons, hasLength(2));
    });

    testWidgets('counts the absence from when the app left, not from the last time it looked', (tester) async {
      final container = await open(tester, enabled: true);

      leaveApp(tester);
      now = now.add(const Duration(seconds: 20));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      now = now.add(const Duration(seconds: 20));
      phone.results.add(DeviceAuthResult.canceled);
      returnToApp(tester);
      await tester.pumpAndSettle();

      expect(stateOf(container).locked, isTrue);
    });

    testWidgets('never locks a lock that is off', (tester) async {
      final container = await open(tester);

      leaveApp(tester);
      now = now.add(const Duration(hours: 5));
      returnToApp(tester);
      await tester.pumpAndSettle();

      expect(stateOf(container).locked, isFalse);
      expect(phone.reasons, isEmpty);
    });
  });

  group('turning it on and off', () {
    testWidgets('turns on after the phone confirms the owner, without locking them straight away', (tester) async {
      final container = await open(tester);

      final change = await notifierOf(container).enable();

      expect(change, AppLockChange.done);
      expect(stateOf(container).enabled, isTrue);
      expect(stateOf(container).locked, isFalse);
      expect(store.enabled, isTrue);
      expect(phone.reasons.single, contains('turn on'));
    });

    testWidgets('does not turn on when the phone has no screen lock, and asks nothing', (tester) async {
      phone.available = false;
      final container = await open(tester);

      final change = await notifierOf(container).enable();

      expect(change, AppLockChange.notSupported);
      expect(stateOf(container).enabled, isFalse);
      expect(phone.reasons, isEmpty);
    });

    testWidgets('does not turn on if the owner is not confirmed', (tester) async {
      final container = await open(tester);
      for (final result in [DeviceAuthResult.failed, DeviceAuthResult.canceled]) {
        phone.results.add(result);
        expect(await notifierOf(container).enable(), AppLockChange.notConfirmed);
      }

      expect(stateOf(container).enabled, isFalse);
      expect(store.enabled, isFalse);
    });

    testWidgets('reports a phone that lost its screen lock while asking as not supported', (tester) async {
      final container = await open(tester);
      phone.results.add(DeviceAuthResult.unavailable);

      expect(await notifierOf(container).enable(), AppLockChange.notSupported);
      expect(store.enabled, isFalse);
    });

    testWidgets('turns off only after the phone confirms the owner: an unlocked phone can not quietly remove it', (
      tester,
    ) async {
      final container = await open(tester, enabled: true);
      phone.results.add(DeviceAuthResult.failed);

      expect(await notifierOf(container).disable(), AppLockChange.notConfirmed);
      expect(stateOf(container).enabled, isTrue);
      expect(store.enabled, isTrue);

      expect(await notifierOf(container).disable(), AppLockChange.done);
      expect(stateOf(container).enabled, isFalse);
      expect(store.enabled, isFalse);
    });

    testWidgets('lets it be turned off when the phone can no longer check, since refusing would protect nothing', (
      tester,
    ) async {
      final container = await open(tester, enabled: true);
      phone.results.add(DeviceAuthResult.unavailable);

      expect(await notifierOf(container).disable(), AppLockChange.done);
      expect(store.enabled, isFalse);
    });

    testWidgets('is switched off when the person signs out, so the next person on this phone does not inherit it', (
      tester,
    ) async {
      final container = await open(tester, enabled: true);
      expect(store.enabled, isTrue);

      await container.read(authStateProvider.notifier).logout();
      await tester.pumpAndSettle();

      expect(store.enabled, isFalse);
      expect(stateOf(container).enabled, isFalse);
      expect(stateOf(container).locked, isFalse);
    });

    testWidgets('does not treat the phone’s own prompt as the person leaving', (tester) async {
      final container = await open(tester);
      phone.hold = Completer<void>();

      final pending = notifierOf(container).enable();
      await tester.pump();
      leaveApp(tester);
      now = now.add(const Duration(minutes: 5));
      returnToApp(tester);
      phone.hold!.complete();
      await pending;
      await tester.pumpAndSettle();

      expect(stateOf(container).enabled, isTrue);
      expect(stateOf(container).locked, isFalse);
    });
  });

  group('the switch in Settings', () {
    Future<ProviderContainer> openSettings(WidgetTester tester, {bool enabled = false}) =>
        open(tester, enabled: enabled, home: const SettingsScreen(), settle: false);

    Finder appLockSwitch() => find.widgetWithText(SwitchListTile, 'App lock');

    testWidgets('shows the lock as off, and turns it on after the phone confirms', (tester) async {
      final container = await openSettings(tester);
      await tester.scrollUntilVisible(appLockSwitch(), 200, scrollable: find.byType(Scrollable).first);

      expect(tester.widget<SwitchListTile>(appLockSwitch()).value, isFalse);

      await tester.tap(appLockSwitch());
      await _pumpFor(tester);

      expect(tester.widget<SwitchListTile>(appLockSwitch()).value, isTrue);
      expect(stateOf(container).enabled, isTrue);
    });

    testWidgets('says what to do when the phone has no screen lock, and stays off', (tester) async {
      phone.available = false;
      await openSettings(tester);
      await tester.scrollUntilVisible(appLockSwitch(), 200, scrollable: find.byType(Scrollable).first);

      await tester.tap(appLockSwitch());
      await _pumpFor(tester);

      expect(find.textContaining('Set a screen lock'), findsOneWidget);
      expect(tester.widget<SwitchListTile>(appLockSwitch()).value, isFalse);
    });

    testWidgets('says it was not changed when the owner is not confirmed', (tester) async {
      await openSettings(tester);
      await tester.scrollUntilVisible(appLockSwitch(), 200, scrollable: find.byType(Scrollable).first);
      phone.results.add(DeviceAuthResult.failed);

      await tester.tap(appLockSwitch());
      await _pumpFor(tester);

      expect(find.text('App lock was not changed.'), findsOneWidget);
      expect(tester.widget<SwitchListTile>(appLockSwitch()).value, isFalse);
    });
  });
}
