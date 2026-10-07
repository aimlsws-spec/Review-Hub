import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/auth/data/auth_repository.dart';
import 'package:viral_kar/features/auth/data/models/login_challenge_model.dart';
import 'package:viral_kar/features/auth/data/models/phone_change_request_model.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/presentation/screens/new_device_verification_screen.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/features/settings/presentation/screens/delete_account_screen.dart';

import '../../support/router_harness.dart';

class _FakeRepository extends Fake implements AuthRepository {
  final List<Map<String, Object?>> phoneRequests = [];
  final List<String> phoneCodes = [];

  @override
  Future<Result<PhoneChangeRequestModel>> requestPhoneChange({
    required String newPhone,
    String? currentPassword,
  }) async {
    phoneRequests.add({'newPhone': newPhone, 'currentPassword': currentPassword});
    return const Result.success(PhoneChangeRequestModel(expiresIn: 300, sentTo: '****2233'));
  }

  @override
  Future<Result<void>> verifyPhoneChange(String code) async {
    phoneCodes.add(code);
    return const Result.success(null);
  }
}

class _FakeAuth extends AuthStateNotifier {
  _FakeAuth({this.hasPassword = true, this.deleteResult = const Result.success(null)});

  final bool hasPassword;
  final Result<void> deleteResult;
  final List<String?> deletePasswords = [];
  int refreshed = 0;

  @override
  Future<UserModel?> build() async => UserModel(
    id: 'u1',
    firstName: 'Asha',
    lastName: 'Patel',
    status: 'ACTIVE',
    phone: '+919876543210',
    hasPassword: hasPassword,
  );

  @override
  Future<Result<void>> deleteAccount({String? currentPassword}) async {
    deletePasswords.add(currentPassword);
    return deleteResult;
  }

  @override
  Future<void> refreshProfile() async => refreshed++;
}

Future<void> _pump(WidgetTester tester, Widget screen, {_FakeAuth? auth, _FakeRepository? repository}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authStateProvider.overrideWith(() => auth ?? _FakeAuth()),
        if (repository != null) authRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp.router(routerConfig: routerFor(screen)),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('DeleteAccountScreen', () {
    testWidgets('asks for the password, confirms, then deletes with it', (tester) async {
      final auth = _FakeAuth();
      await _pump(tester, const DeleteAccountScreen(), auth: auth);

      await tester.enterText(find.byKey(const Key('deletePassword')), 'Passw0rd!23');
      await tester.ensureVisible(find.text('Delete my account'));
      await tester.tap(find.text('Delete my account'));
      await tester.pumpAndSettle();
      expect(find.text('Delete your account?'), findsOneWidget);

      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      expect(auth.deletePasswords, ['Passw0rd!23']);
      expect(find.text('Login'), findsOneWidget);
    });

    testWidgets('does nothing when the confirmation is cancelled', (tester) async {
      final auth = _FakeAuth();
      await _pump(tester, const DeleteAccountScreen(), auth: auth);

      await tester.enterText(find.byKey(const Key('deletePassword')), 'Passw0rd!23');
      await tester.ensureVisible(find.text('Delete my account'));
      await tester.tap(find.text('Delete my account'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(auth.deletePasswords, isEmpty);
    });

    testWidgets('shows the server\'s reason when it refuses', (tester) async {
      final auth = _FakeAuth(
        deleteResult: const Result.failure(ValidationFailure('Your wallet still has money in it.')),
      );
      await _pump(tester, const DeleteAccountScreen(), auth: auth);

      await tester.enterText(find.byKey(const Key('deletePassword')), 'Passw0rd!23');
      await tester.ensureVisible(find.text('Delete my account'));
      await tester.tap(find.text('Delete my account'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      expect(find.text('Your wallet still has money in it.'), findsOneWidget);
    });

    testWidgets('asks for no password on a Google/Apple-only account', (tester) async {
      final auth = _FakeAuth(hasPassword: false);
      await _pump(tester, const DeleteAccountScreen(), auth: auth);

      expect(find.byKey(const Key('deletePassword')), findsNothing);
      await tester.ensureVisible(find.text('Delete my account'));
      await tester.tap(find.text('Delete my account'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      expect(auth.deletePasswords, [null]);
    });
  });

  group('NewDeviceVerificationScreen', () {
    testWidgets('says where the code went', (tester) async {
      await _pump(
        tester,
        const NewDeviceVerificationScreen(
          challenge: LoginChallengeModel(
            challengeToken: 'token',
            expiresIn: 300,
            sentTo: ['j****n@example.com', '****3210'],
          ),
        ),
      );

      expect(find.text('Enter the code we sent to j****n@example.com and ****3210.'), findsOneWidget);
      expect(find.textContaining('Resend code in'), findsOneWidget);
    });

    testWidgets('asks to sign in again when opened without a challenge', (tester) async {
      await _pump(tester, const NewDeviceVerificationScreen(challenge: null));

      expect(find.text('This sign-in has expired. Please sign in again.'), findsOneWidget);
    });
  });
}
