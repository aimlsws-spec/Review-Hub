import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/features/legal/data/legal_repository.dart';
import 'package:viral_kar/features/legal/data/models/content_page_model.dart';
import 'package:viral_kar/features/legal/presentation/screens/policy_acceptance_screen.dart';
import 'package:viral_kar/features/legal/presentation/screens/policy_document_screen.dart';
import 'package:viral_kar/features/legal/providers/legal_providers.dart';

class _JsonAdapter implements HttpClientAdapter {
  _JsonAdapter(this.status, this.body);

  final int status;
  final Object body;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _FakeLegalRepository extends Fake implements LegalRepository {
  Result<ContentPageModel> page = const Result.success(
    ContentPageModel(slug: 'reward-policy', title: 'Reward Policy', content: 'Rewards are paid for honest feedback.'),
  );
  int accepted = 0;
  Result<void> acceptResult = const Result.success(null);

  @override
  Future<Result<ContentPageModel>> getPage(String slug) async => page;

  @override
  Future<Result<void>> acceptPolicies() async {
    accepted++;
    return acceptResult;
  }
}

/// A signed-in person with documents to accept; refreshing the profile clears them, as the server would.
class _FakeAuth extends AuthStateNotifier {
  int refreshed = 0;

  @override
  Future<UserModel?> build() async => const UserModel(
    id: 'u1',
    firstName: 'Asha',
    lastName: 'Patel',
    status: 'ACTIVE',
    pendingPolicies: ['REWARD_POLICY'],
  );

  @override
  Future<void> refreshProfile() async {
    refreshed++;
    state = AsyncData(state.value!.copyWith(pendingPolicies: const []));
  }
}

void main() {
  group('LegalRepository', () {
    test('reads a published page by slug', () async {
      final adapter = _JsonAdapter(200, {
        'success': true,
        'data': {
          'slug': 'privacy-policy',
          'title': 'Privacy Policy',
          'content': 'We keep your data safe.',
          'publishedAt': '2026-10-01T00:00:00.000Z',
        },
      });
      final repository = LegalRepository(Dio()..httpClientAdapter = adapter);

      final page = (await repository.getPage('privacy-policy')).valueOrNull;

      expect(adapter.requests.single.path, '/pages/privacy-policy');
      expect(page?.title, 'Privacy Policy');
      expect(page?.content, 'We keep your data safe.');
    });

    test('reports a page that is not published as not found', () async {
      final repository = LegalRepository(
        Dio()..httpClientAdapter = _JsonAdapter(404, {'success': false, 'message': 'Page was not found.'}),
      );

      expect((await repository.getPage('reward-policy')).failureOrNull, isA<NotFoundFailure>());
    });

    test('accepts the policies', () async {
      final adapter = _JsonAdapter(200, {'success': true, 'data': []});

      await LegalRepository(Dio()..httpClientAdapter = adapter).acceptPolicies();

      expect(adapter.requests.single.method, 'POST');
      expect(adapter.requests.single.path, '/auth/policies/accept');
    });
  });

  group('PolicyDocumentScreen', () {
    Future<void> open(WidgetTester tester, _FakeLegalRepository repository) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [legalRepositoryProvider.overrideWithValue(repository)],
          child: const MaterialApp(home: PolicyDocumentScreen(slug: 'reward-policy')),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('shows the published text', (tester) async {
      await open(tester, _FakeLegalRepository());

      expect(find.text('Reward Policy'), findsOneWidget);
      expect(find.text('Rewards are paid for honest feedback.'), findsOneWidget);
    });

    testWidgets('says plainly when the document is not published yet, with nothing to retry', (tester) async {
      await open(tester, _FakeLegalRepository()..page = const Result.failure(NotFoundFailure()));

      expect(find.textContaining('has not been published yet'), findsOneWidget);
      expect(find.text('Try again'), findsNothing);
    });

    testWidgets('offers a retry for other failures', (tester) async {
      await open(tester, _FakeLegalRepository()..page = const Result.failure(NetworkFailure()));

      expect(find.text('Try again'), findsOneWidget);
    });
  });

  group('PolicyAcceptanceScreen', () {
    Future<(_FakeLegalRepository, _FakeAuth)> open(WidgetTester tester) async {
      final repository = _FakeLegalRepository();
      final auth = _FakeAuth();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            legalRepositoryProvider.overrideWithValue(repository),
            authStateProvider.overrideWith(() => auth),
          ],
          child: const MaterialApp(home: PolicyAcceptanceScreen()),
        ),
      );
      await tester.pumpAndSettle();
      return (repository, auth);
    }

    testWidgets('names the documents still to accept, and links to each', (tester) async {
      await open(tester);

      expect(find.textContaining('accept our Reward Policy'), findsOneWidget);
      expect(find.text('Terms & Conditions'), findsOneWidget);
      expect(find.text('Privacy Policy'), findsOneWidget);
    });

    testWidgets('accepting records it and reloads the profile, which clears the gate', (tester) async {
      final (repository, auth) = await open(tester);

      await tester.tap(find.text('I accept'));
      await tester.pumpAndSettle();

      expect(repository.accepted, 1);
      expect(auth.refreshed, 1);
    });

    testWidgets('shows why accepting failed', (tester) async {
      final repository = _FakeLegalRepository()..acceptResult = const Result.failure(ServerFailure('Try again later.'));
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            legalRepositoryProvider.overrideWithValue(repository),
            authStateProvider.overrideWith(_FakeAuth.new),
          ],
          child: const MaterialApp(home: PolicyAcceptanceScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('I accept'));
      await tester.pumpAndSettle();

      expect(find.text('Try again later.'), findsOneWidget);
    });
  });
}
