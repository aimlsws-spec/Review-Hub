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
  final List<Map<String, String?>> contacts = [];

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
    contacts.add({'email': email, 'phone': phone});
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

  // Fields in order: first name, last name, email, phone (optional), password, confirm password, referral code.
  Future<void> fillForm(WidgetTester tester, {String email = 'asha@example.com', String phone = ''}) async {
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Asha');
    await tester.enterText(fields.at(1), 'Patel');
    await tester.enterText(fields.at(2), email);
    await tester.enterText(fields.at(3), phone);
    await tester.enterText(fields.at(4), 'Passw0rd!23');
    await tester.enterText(fields.at(5), 'Passw0rd!23');
  }

  Future<void> acceptAndSubmit(WidgetTester tester) async {
    await tester.ensureVisible(find.byKey(const Key('acceptPolicies')));
    await tester.tap(find.byKey(const Key('acceptPolicies')));
    await tester.pump();
    await tester.ensureVisible(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.tap(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.pumpAndSettle();
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

    await tester.ensureVisible(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.tap(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.pumpAndSettle();

    expect(
      find.text('Please accept the Terms & Conditions, Privacy Policy and Reward Policy'),
      findsOneWidget,
    );
    expect(auth.acceptedPolicies, isEmpty);

    await tester.ensureVisible(find.byKey(const Key('acceptPolicies')));
    await tester.tap(find.byKey(const Key('acceptPolicies')));
    await tester.pump();
    expect(find.byKey(const Key('policyRequiredError')), findsNothing);

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
    await tester.enterText(fields.at(2), 'asha@example.com');
    await tester.enterText(fields.at(4), 'Pass@123');
    await tester.enterText(fields.at(5), 'Pass@123');
    await tester.ensureVisible(find.byKey(const Key('acceptPolicies')));
    await tester.tap(find.byKey(const Key('acceptPolicies')));
    await tester.pump();

    await tester.ensureVisible(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.tap(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.pump();

    expect(find.text('Password must be at least 10 characters'), findsOneWidget);
  });

  testWidgets('asks for an email address, since every code goes by email', (tester) async {
    final auth = await open(tester);
    await fillForm(tester, email: '');

    await acceptAndSubmit(tester);

    expect(find.text('Enter your email address'), findsOneWidget);
    expect(auth.contacts, isEmpty);
  });

  testWidgets('signs up with an email and no phone number', (tester) async {
    final auth = await open(tester);
    await fillForm(tester);

    await acceptAndSubmit(tester);

    expect(auth.contacts.single, {'email': 'asha@example.com', 'phone': null});
  });

  testWidgets('sends a phone number when one is given, and checks it', (tester) async {
    final auth = await open(tester);
    await fillForm(tester, phone: '12345');
    await acceptAndSubmit(tester);
    expect(find.text('Enter a valid phone number'), findsOneWidget);
    expect(auth.contacts, isEmpty);

    await tester.enterText(find.byType(TextFormField).at(3), '9876543210');
    await tester.ensureVisible(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.tap(find.widgetWithText(LoadingButton, 'Create account'));
    await tester.pumpAndSettle();

    expect(auth.contacts.single, {'email': 'asha@example.com', 'phone': '9876543210'});
  });
}
