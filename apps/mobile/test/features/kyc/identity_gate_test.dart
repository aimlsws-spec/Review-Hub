import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/core/router/route_paths.dart';
import 'package:viral_kar/features/kyc/data/identity_requirement.dart';
import 'package:viral_kar/features/kyc/data/kyc_repository.dart';
import 'package:viral_kar/features/kyc/data/models/kyc_document_model.dart';
import 'package:viral_kar/features/kyc/presentation/widgets/identity_gate.dart';
import 'package:viral_kar/features/kyc/providers/kyc_providers.dart';

KycDocumentModel _document(String type, String status) => KycDocumentModel(
  id: '$type-$status',
  userId: 'user-1',
  documentType: type,
  verificationStatus: status,
  createdAt: DateTime(2026, 10, 7),
  updatedAt: DateTime(2026, 10, 7),
);

class _FakeKycRepository extends Fake implements KycRepository {
  _FakeKycRepository(this.documents);

  final List<KycDocumentModel> documents;

  @override
  Future<Result<List<KycDocumentModel>>> getDocuments() async =>
      Result.success(documents);
}

void main() {
  group('hasIdentityDocument', () {
    test(
      'PAN or any one identity document unlocks, even while waiting for review',
      () {
        expect(hasIdentityDocument([_document('PAN', 'PENDING')]), isTrue);
        expect(
          hasIdentityDocument([_document('AADHAAR', 'UNDER_REVIEW')]),
          isTrue,
        );
        expect(
          hasIdentityDocument([_document('PASSPORT', 'APPROVED')]),
          isTrue,
        );
        expect(
          hasIdentityDocument([_document('DRIVING_LICENCE', 'PENDING')]),
          isTrue,
        );
      },
    );

    test('nothing, a selfie alone, or only rejected documents stay locked', () {
      expect(hasIdentityDocument([]), isFalse);
      expect(hasIdentityDocument([_document('SELFIE', 'APPROVED')]), isFalse);
      expect(
        hasIdentityDocument([
          _document('PAN', 'REJECTED'),
          _document('AADHAAR', 'REJECTED'),
        ]),
        isFalse,
      );
    });
  });

  /// A small app with a locked Wallet route, a task-start button, and the KYC screen.
  Future<void> open(
    WidgetTester tester,
    List<KycDocumentModel> documents, {
    String initial = '/wallet',
  }) async {
    final router = GoRouter(
      initialLocation: initial,
      routes: [
        GoRoute(
          path: '/wallet',
          builder: (context, state) => const IdentityGate(
            featureName: 'Wallet',
            child: Text('Wallet content'),
          ),
        ),
        GoRoute(
          path: '/task',
          builder: (context, state) => Scaffold(
            body: Consumer(
              builder: (context, ref, _) => TextButton(
                onPressed: () async {
                  if (await ensureIdentityVerified(context, ref) &&
                      context.mounted) {
                    context.go('/started');
                  }
                },
                child: const Text('Start task'),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/started',
          builder: (context, state) => const Text('Task started'),
        ),
        GoRoute(
          path: RoutePaths.kyc,
          builder: (context, state) => const Text('KYC screen'),
        ),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          kycRepositoryProvider.overrideWithValue(
            _FakeKycRepository(documents),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
  }

  group('IdentityGate', () {
    testWidgets('locks the feature with the reason and a way to verify', (
      tester,
    ) async {
      await open(tester, []);

      expect(find.text('Wallet content'), findsNothing);
      expect(find.text('Complete identity verification'), findsOneWidget);
      expect(find.text(kIdentityRequiredMessage), findsOneWidget);

      await tester.tap(find.text('Verify identity'));
      await tester.pumpAndSettle();
      expect(find.text('KYC screen'), findsOneWidget);
    });

    testWidgets('opens the feature once an identity document is uploaded', (
      tester,
    ) async {
      await open(tester, [_document('AADHAAR', 'PENDING')]);

      expect(find.text('Wallet content'), findsOneWidget);
      expect(find.byKey(const Key('identityRequired')), findsNothing);
    });
  });

  group('ensureIdentityVerified', () {
    testWidgets(
      'stops an earning action with an alert offering to verify now',
      (tester) async {
        await open(tester, [], initial: '/task');

        await tester.tap(find.text('Start task'));
        await tester.pumpAndSettle();

        expect(find.text('Identity verification required'), findsOneWidget);
        expect(find.text('Task started'), findsNothing);

        await tester.tap(find.text('Verify now'));
        await tester.pumpAndSettle();
        expect(find.text('KYC screen'), findsOneWidget);
      },
    );

    testWidgets('lets the action through for a verified person', (
      tester,
    ) async {
      await open(tester, [_document('PAN', 'APPROVED')], initial: '/task');

      await tester.tap(find.text('Start task'));
      await tester.pumpAndSettle();

      expect(find.text('Task started'), findsOneWidget);
    });
  });
}
