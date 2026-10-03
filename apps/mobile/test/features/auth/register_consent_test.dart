import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/presentation/screens/register_screen.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/shared/widgets/loading_button.dart';

import '../../support/router_harness.dart';

/// Signed out, and records what a sign-up would send instead of calling the server.
class _FakeAuth extends AuthStateNotifier {
  final List<bool> acceptedPolicies = [];

  @override
  Future<UserModel?> build() async => null;

  @override
  Future<Result<UserModel?>> register({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    required String password,
    required bool acceptPolicies,
    String? referralCode,
  }) async {
    acceptedPolicies.add(acceptPolicies);
    return const Result.success(null);
  }
}

void main() {
  Future<_FakeAuth> open(WidgetTester tester) async {
    final auth = _FakeAuth();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authStateProvider.overrideWith(() => auth)],
        child: MaterialApp.router(routerConfig: routerFor(const RegisterScreen())),
      ),
    );
    await tester.pumpAndSettle();
    return auth;
  }

  LoadingButton createButton(WidgetTester tester) =>
      tester.widget<LoadingButton>(find.widgetWithText(LoadingButton, 'Create account'));

  Future<void> fillForm(WidgetTester tester) async {
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Asha');
    await tester.enterText(fields.at(1), 'Patel');
    await tester.enterText(fields.at(2), '9876543210');
    await tester.enterText(fields.at(3), 'Passw0rd!23');
    await tester.enterText(fields.at(4), 'Passw0rd!23');
  }

  testWidgets('links to all three policies', (tester) async {
    await open(tester);

    expect(find.text('Terms & Conditions'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);
    expect(find.text('Reward Policy'), findsOneWidget);
  });

  testWidgets('opens each policy from its link', (tester) async {
    await open(tester);

    await tester.tap(find.text('Privacy Policy'));
    await tester.pumpAndSettle();

    expect(find.text('Policy privacy-policy'), findsOneWidget);
  });

  testWidgets('offers signing up with Google, and only Google', (tester) async {
    await open(tester);

    expect(find.text('Sign up with Google'), findsOneWidget);
    expect(find.textContaining('Apple'), findsNothing);
  });

  testWidgets('cannot create an account until the policies are accepted', (tester) async {
    final auth = await open(tester);
    await fillForm(tester);

    expect(createButton(tester).onPressed, isNull);

    await tester.ensureVisible(find.byKey(const Key('acceptPolicies')));
    await tester.tap(find.byKey(const Key('acceptPolicies')));
    await tester.pump();
    expect(createButton(tester).onPressed, isNotNull);

    await tester.ensureVisible(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.tap(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.pumpAndSettle();

    expect(auth.acceptedPolicies, [true]);
    expect(find.text('Home'), findsOneWidget);
  });

  testWidgets('refuses a password shorter than 10 characters', (tester) async {
    await open(tester);
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Asha');
    await tester.enterText(fields.at(1), 'Patel');
    await tester.enterText(fields.at(2), '9876543210');
    await tester.enterText(fields.at(3), 'Pass@123');
    await tester.enterText(fields.at(4), 'Pass@123');
    await tester.ensureVisible(find.byKey(const Key('acceptPolicies')));
    await tester.tap(find.byKey(const Key('acceptPolicies')));
    await tester.pump();

    await tester.ensureVisible(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.tap(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.pump();

    expect(find.text('Use at least 10 characters'), findsOneWidget);
  });
}
