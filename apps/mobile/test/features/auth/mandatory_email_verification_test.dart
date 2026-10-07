import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/auth/data/auth_repository.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/data/otp_type.dart';
import 'package:viral_kar/features/auth/presentation/screens/otp_verification_screen.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';

import '../../support/router_harness.dart';

/// Records the codes asked for and checked, without a server.
class _FakeRepository extends Fake implements AuthRepository {
  final List<OtpType> sent = [];
  final List<String> verified = [];

  @override
  Future<Result<void>> sendOtp(OtpType type) async {
    sent.add(type);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> verifyOtp(OtpType type, String code) async {
    verified.add(code);
    return const Result.success(null);
  }
}

/// A new account whose email is not verified yet.
class _FakeAuth extends AuthStateNotifier {
  int refreshed = 0;
  int signedOut = 0;

  @override
  Future<UserModel?> build() async => const UserModel(
    id: 'user-1',
    firstName: 'Asha',
    lastName: 'Patel',
    email: 'asha@example.com',
    status: 'PENDING_VERIFICATION',
  );

  @override
  Future<void> refreshProfile() async => refreshed++;

  @override
  Future<void> logout() async => signedOut++;
}

void main() {
  Future<(_FakeAuth, _FakeRepository)> open(WidgetTester tester) async {
    final repository = _FakeRepository();
    final auth = _FakeAuth();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          authStateProvider.overrideWith(() => auth),
        ],
        child: MaterialApp.router(
          routerConfig: routerFor(
            const OtpVerificationScreen(
              type: OtpType.emailVerification,
              mandatory: true,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return (auth, repository);
  }

  testWidgets(
    'emails the code straight away, says where it went, and has no way past it',
    (tester) async {
      final (_, repository) = await open(tester);

      expect(find.text('Verify your email'), findsOneWidget);
      expect(repository.sent, [OtpType.emailVerification]);
      expect(find.textContaining('Sent to asha@example.com.'), findsOneWidget);
      expect(find.byType(BackButton), findsNothing);
      expect(find.textContaining('Skip'), findsNothing);
    },
  );

  testWidgets(
    'a correct code reloads the profile, which lets the router move on',
    (tester) async {
      final (auth, repository) = await open(tester);

      await tester.enterText(find.byType(TextField), '123456');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();

      expect(repository.verified, ['123456']);
      expect(auth.refreshed, 1);
    },
  );

  testWidgets('a mistyped address can only be left by signing out', (
    tester,
  ) async {
    final (auth, repository) = await open(tester);

    await tester.tap(find.byKey(const Key('signOutFromVerification')));
    await tester.pumpAndSettle();

    expect(auth.signedOut, 1);
    expect(repository.verified, isEmpty);
  });
}
