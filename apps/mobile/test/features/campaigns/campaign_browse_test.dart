import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/features/campaigns/data/campaign_repository.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_browse.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_model.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_task_model.dart';
import 'package:viral_kar/features/campaigns/data/saved_campaigns_repository.dart';
import 'package:viral_kar/features/campaigns/data/saved_campaigns_store.dart';
import 'package:viral_kar/features/campaigns/presentation/screens/campaign_detail_screen.dart';
import 'package:viral_kar/features/campaigns/presentation/screens/campaigns_screen.dart';
import 'package:viral_kar/features/campaigns/providers/campaign_providers.dart';
import 'package:viral_kar/shared/models/api_response.dart';
import 'package:viral_kar/shared/models/paged_list.dart';

CampaignModel _campaign(String id, {String title = 'Brew Bar', String reward = '50.00'}) => CampaignModel(
  id: id,
  title: title,
  slug: id,
  description: 'Tell us honestly how your visit went.',
  campaignType: 'REVIEW',
  status: 'ACTIVE',
  rewardType: 'CASH',
  rewardAmount: reward,
);

class _Browse {
  _Browse({this.sort, this.type, this.search, this.page = 1});

  final int page;
  final String? sort;
  final String? type;
  final String? search;
}

/// Stands in for the server: serves the campaigns the test sets, a page at a time, and records what was asked.
class _FakeCampaignRepository extends Fake implements CampaignRepository {
  List<CampaignModel> browseResult = [_campaign('c1', title: 'Brew Bar')];
  Result<PaginatedResponse<CampaignModel>>? browseFailure;

  /// When set, every page after the first fails with it.
  Failure? failLaterPages;

  /// When set, every page after the first waits for it.
  Completer<void>? hold;
  final Map<String, Result<CampaignModel>> byId = {};
  final List<_Browse> browses = [];
  final List<String> fetched = [];
  List<CampaignTaskModel> tasks = const [];

  @override
  Future<Result<PaginatedResponse<CampaignModel>>> browsePublic({
    int page = 1,
    int limit = 20,
    String? campaignType,
    String? search,
    String sort = 'featured',
    double? latitude,
    double? longitude,
  }) async {
    browses.add(_Browse(sort: sort, type: campaignType, search: search, page: page));
    if (page > 1) await hold?.future;
    final failure = failLaterPages;
    if (page > 1 && failure != null) return Result.failure(failure);
    final items = browseResult.skip((page - 1) * limit).take(limit).toList();
    return browseFailure ??
        Result.success(PaginatedResponse(items: items, total: browseResult.length, page: page, limit: limit));
  }

  @override
  Future<Result<CampaignModel>> getPublicCampaign(String campaignId) async {
    fetched.add(campaignId);
    return byId[campaignId] ?? Result.success(_campaign(campaignId));
  }

  @override
  Future<Result<List<CampaignTaskModel>>> getTasks(String campaignId) async => Result.success(tasks);
}

/// This phone's copy of the saved list. The signed-in person in these tests is u1.
class _MemorySavedStore implements SavedCampaignsStore {
  _MemorySavedStore([List<String>? initial]) : saved = [...?initial];

  /// u1's copy.
  List<String> saved;
  final Map<String, List<String>> others = {};

  /// What the phone kept before saving moved to the server.
  List<String> legacy = const [];

  @override
  List<String> idsFor(String userId) => userId == 'u1' ? saved : others[userId] ?? const [];

  @override
  Future<void> writeFor(String userId, List<String> ids) async =>
      userId == 'u1' ? saved = [...ids] : others[userId] = [...ids];

  @override
  List<String> get legacyIds => legacy;

  @override
  Future<void> clearLegacy() async => legacy = const [];
}

/// Stands in for the server's saved list: answers with the whole list, like the real one.
class _FakeSavedServer extends Fake implements SavedCampaignsRepository {
  List<String> ids = [];

  /// When set, every call fails with it and nothing changes.
  Failure? failure;
  final List<List<String>> imported = [];
  final List<String> removed = [];

  Future<Result<List<String>>> _answer() async {
    final failure = this.failure;
    return failure == null ? Result.success([...ids]) : Result.failure(failure);
  }

  @override
  Future<Result<List<String>>> list() => _answer();

  @override
  Future<Result<List<String>>> save(String campaignId) {
    if (failure == null && !ids.contains(campaignId)) ids = [campaignId, ...ids];
    return _answer();
  }

  @override
  Future<Result<List<String>>> remove(String campaignId) {
    removed.add(campaignId);
    if (failure == null) ids = [...ids.where((id) => id != campaignId)];
    return _answer();
  }

  @override
  Future<Result<List<String>>> importIds(List<String> campaignIds) {
    imported.add(campaignIds);
    if (failure == null) ids = [...campaignIds.where((id) => !ids.contains(id)), ...ids];
    return _answer();
  }
}

class _FakeAuth extends AuthStateNotifier {
  @override
  Future<UserModel?> build() async =>
      const UserModel(id: 'u1', firstName: 'Asha', lastName: 'Patel', status: 'ACTIVE', referralCode: 'ASHA123');
}

class _SignedOut extends AuthStateNotifier {
  @override
  Future<UserModel?> build() async => null;
}

void main() {
  late _FakeCampaignRepository repository;
  late _MemorySavedStore store;
  late _FakeSavedServer server;
  late List<String> shared;

  setUp(() {
    repository = _FakeCampaignRepository();
    store = _MemorySavedStore();
    server = _FakeSavedServer();
    shared = [];
  });

  ProviderContainer makeContainer() {
    final container = ProviderContainer(
      overrides: [
        campaignRepositoryProvider.overrideWithValue(repository),
        savedCampaignsStoreProvider.overrideWithValue(store),
        savedCampaignsRepositoryProvider.overrideWithValue(server),
        shareTextProvider.overrideWithValue((text) async => shared.add(text)),
        authStateProvider.overrideWith(_FakeAuth.new),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  /// Saved before this test, on the server and in this phone's copy.
  void savedBefore(List<String> ids) {
    store.saved = [...ids];
    server.ids = [...ids];
  }

  /// A container with u1 signed in, after the saved list has synced with the server.
  Future<ProviderContainer> signedIn() async {
    final container = makeContainer();
    await container.read(authStateProvider.future);
    container.read(savedCampaignIdsProvider);
    await Future<void>.delayed(Duration.zero);
    return container;
  }

  Future<ProviderContainer> show(WidgetTester tester, Widget screen) async {
    tester.view.physicalSize = const Size(800, 3600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final container = makeContainer();
    await container.read(authStateProvider.future);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(home: screen),
      ),
    );
    await tester.pumpAndSettle();
    return container;
  }

  group('the words the app sends to the server', () {
    test('sort names are the API’s own', () {
      expect(CampaignSort.values.map((s) => s.apiValue), [
        'featured',
        'popular',
        'newest',
        'highest_reward',
        'ending_soon',
        'nearest',
      ]);
    });

    test('kinds are the API’s own campaign types', () {
      expect(CampaignCategory.values.map((c) => c.apiValue), [
        'REVIEW',
        'SOCIAL_SHARE',
        'SOCIAL_FOLLOW',
        'REFERRAL',
        'APP_INSTALL',
        'VIDEO_WATCH',
        'WEBSITE_VISIT',
        'SURVEY',
        'CUSTOM',
      ]);
    });

    test('offers a chip only for the kinds merchants can create today', () {
      expect(CampaignCategory.offered.map((c) => c.apiValue), ['REVIEW', 'SOCIAL_SHARE', 'SOCIAL_FOLLOW']);
    });
  });

  group('CampaignBrowseFilter', () {
    test('starts with nothing narrowed', () {
      expect(const CampaignBrowseFilter().isNarrowed, isFalse);
    });

    test('is narrowed by a search, a kind or a different order, but not by the saved view', () {
      expect(const CampaignBrowseFilter(search: 'cafe').isNarrowed, isTrue);
      expect(const CampaignBrowseFilter(category: CampaignCategory.survey).isNarrowed, isTrue);
      expect(const CampaignBrowseFilter(sort: CampaignSort.newest).isNarrowed, isTrue);
      expect(const CampaignBrowseFilter(savedOnly: true).isNarrowed, isFalse);
    });

    test('can go back to every kind', () {
      final narrowed = const CampaignBrowseFilter().copyWith(category: CampaignCategory.survey);

      expect(narrowed.copyWith(clearCategory: true).category, isNull);
      expect(narrowed.copyWith(sort: CampaignSort.newest).category, CampaignCategory.survey);
    });
  });

  group('campaignShareText', () {
    test('says what is earned, names the campaign, and includes the referral code', () {
      final text = campaignShareText(
        _campaign('c1', title: 'Brew Bar', reward: '50.00'),
        referralCode: 'ASHA123',
      );

      expect(text, contains('₹50'));
      expect(text, contains('Brew Bar'));
      expect(text, contains('ASHA123'));
    });

    test('leaves the referral line out when there is no code', () {
      for (final code in <String?>[null, '', '   ']) {
        expect(campaignShareText(_campaign('c1'), referralCode: code), isNot(contains('referral')));
      }
    });

    test('does not promise an amount that is not there', () {
      expect(campaignShareText(_campaign('c1', reward: '0')), contains('rewards'));
      expect(campaignShareText(_campaign('c1', reward: 'oops')), isNot(contains('₹')));
    });

    test('never suggests being paid for a review, only for completing a task', () {
      final text = campaignShareText(_campaign('c1')).toLowerCase();

      expect(text, contains('completing a task'));
      expect(text, isNot(contains('review')));
      expect(text, isNot(contains('star')));
    });
  });

  group('saved campaigns', () {
    test('saves newest first, keeps them on the phone, and takes one off when asked again', () async {
      final container = await signedIn();
      final notifier = container.read(savedCampaignIdsProvider.notifier);

      expect(await notifier.toggle('a'), SaveOutcome.saved);
      expect(await notifier.toggle('b'), SaveOutcome.saved);
      expect(container.read(savedCampaignIdsProvider), ['b', 'a']);
      expect(store.saved, ['b', 'a']);

      expect(await notifier.toggle('b'), SaveOutcome.removed);
      expect(container.read(savedCampaignIdsProvider), ['a']);
      expect(store.saved, ['a']);
    });

    test('starts from what was saved before', () async {
      savedBefore(['x', 'y']);

      expect((await signedIn()).read(savedCampaignIdsProvider), ['x', 'y']);
    });

    test('stops at the limit, so the saved view stays quick to open, and says so', () async {
      savedBefore([for (var i = 0; i < SavedCampaignsStore.maxSaved; i++) 'c$i']);
      final container = await signedIn();

      expect(await container.read(savedCampaignIdsProvider.notifier).toggle('one-more'), SaveOutcome.listFull);
      expect(container.read(savedCampaignIdsProvider), hasLength(SavedCampaignsStore.maxSaved));
      expect(await container.read(savedCampaignIdsProvider.notifier).toggle('c0'), SaveOutcome.removed);
    });

    test('fetches each saved campaign fresh', () async {
      savedBefore(['a', 'b']);
      final container = await signedIn();

      final result = await container.read(savedCampaignsProvider.future);

      expect(result.valueOrNull!.map((c) => c.id), ['a', 'b']);
      expect(repository.fetched, ['a', 'b']);
    });

    test('drops a campaign that has ended from the saved list for good, and keeps the rest', () async {
      savedBefore(['a', 'gone', 'b']);
      repository.byId['gone'] = const Result.failure(NotFoundFailure());
      final container = await signedIn();

      final result = await container.read(savedCampaignsProvider.future);
      await Future<void>.delayed(Duration.zero);

      expect(result.valueOrNull!.map((c) => c.id), ['a', 'b']);
      expect(store.saved, ['a', 'b']);
    });

    test(
      'keeps a campaign it could not reach because of the connection: it is missing from the view, not lost',
      () async {
        savedBefore(['a', 'offline']);
        repository.byId['offline'] = const Result.failure(NetworkFailure());
        final container = await signedIn();

        final result = await container.read(savedCampaignsProvider.future);
        await Future<void>.delayed(Duration.zero);

        expect(result.valueOrNull!.map((c) => c.id), ['a']);
        expect(store.saved, ['a', 'offline']);
      },
    );

    test('reports a connection problem, and forgets nothing, when none could be reached', () async {
      savedBefore(['a', 'b']);
      repository.byId['a'] = const Result.failure(NetworkFailure());
      repository.byId['b'] = const Result.failure(NetworkFailure());
      final container = await signedIn();

      final result = await container.read(savedCampaignsProvider.future);

      expect(result.failureOrNull, isA<NetworkFailure>());
      expect(store.saved, ['a', 'b']);
    });

    test('is empty, without asking the server, when nothing is saved', () async {
      final result = await (await signedIn()).read(savedCampaignsProvider.future);

      expect(result.valueOrNull, isEmpty);
      expect(repository.fetched, isEmpty);
    });

    group('on the server', () {
      test('takes the server list over this phone’s copy, so a save made on another phone shows here', () async {
        store.saved = ['old'];
        server.ids = ['from-other-phone', 'old'];

        final container = await signedIn();

        expect(container.read(savedCampaignIdsProvider), ['from-other-phone', 'old']);
        expect(store.saved, ['from-other-phone', 'old']);
      });

      test('shows this phone’s copy when the server can not be reached', () async {
        store.saved = ['a'];
        server.failure = const NetworkFailure();

        expect((await signedIn()).read(savedCampaignIdsProvider), ['a']);
      });

      test('uploads what the phone saved before saving moved to the server, once', () async {
        store.legacy = ['l1', 'l2'];
        server.ids = ['s1'];

        final container = await signedIn();

        expect(server.imported, [
          ['l1', 'l2'],
        ]);
        expect(container.read(savedCampaignIdsProvider), ['l1', 'l2', 's1']);
        expect(store.legacy, isEmpty);
      });

      test('keeps the old list for next time when the upload could not reach the server', () async {
        store.legacy = ['l1'];
        server.failure = const NetworkFailure();

        await signedIn();

        expect(store.legacy, ['l1']);
      });

      test('keeps each person’s list apart on a shared phone', () async {
        store.others['u2'] = ['theirs'];
        server.ids = ['mine'];

        final container = await signedIn();

        expect(container.read(savedCampaignIdsProvider), ['mine']);
        expect(store.others['u2'], ['theirs']);
      });

      test('is empty when nobody is signed in', () async {
        store.saved = ['a'];
        final container = ProviderContainer(
          overrides: [
            savedCampaignsStoreProvider.overrideWithValue(store),
            savedCampaignsRepositoryProvider.overrideWithValue(server),
            authStateProvider.overrideWith(_SignedOut.new),
          ],
        );
        addTearDown(container.dispose);
        await container.read(authStateProvider.future);

        expect(container.read(savedCampaignIdsProvider), isEmpty);
        expect(await container.read(savedCampaignIdsProvider.notifier).toggle('a'), SaveOutcome.failed);
      });

      test('undoes a save the server could not take, and says so', () async {
        savedBefore(['a']);
        final container = await signedIn();
        server.failure = const NetworkFailure();

        expect(await container.read(savedCampaignIdsProvider.notifier).toggle('b'), SaveOutcome.failed);

        expect(container.read(savedCampaignIdsProvider), ['a']);
        expect(store.saved, ['a']);
      });

      test('puts a removed campaign back in its place when the server could not be told', () async {
        savedBefore(['a', 'b', 'c']);
        final container = await signedIn();
        server.failure = const NetworkFailure();

        expect(await container.read(savedCampaignIdsProvider.notifier).toggle('b'), SaveOutcome.failed);

        expect(container.read(savedCampaignIdsProvider), ['a', 'b', 'c']);
      });

      test('says a campaign that has ended can not be saved', () async {
        final container = await signedIn();
        server.failure = const NotFoundFailure();

        expect(await container.read(savedCampaignIdsProvider.notifier).toggle('ended'), SaveOutcome.unavailable);
        expect(container.read(savedCampaignIdsProvider), isEmpty);
      });

      test('says the list is full when the server’s list is, even if this phone’s copy was behind', () async {
        final container = await signedIn();
        server.failure = const ValidationFailure('You can save up to 30 campaigns.');

        expect(await container.read(savedCampaignIdsProvider.notifier).toggle('new'), SaveOutcome.listFull);
        expect(container.read(savedCampaignIdsProvider), isEmpty);
      });

      test('tells the server when an ended campaign drops off the list', () async {
        savedBefore(['a', 'gone']);
        repository.byId['gone'] = const Result.failure(NotFoundFailure());
        final container = await signedIn();

        await container.read(savedCampaignsProvider.future);
        await Future<void>.delayed(Duration.zero);

        expect(server.removed, ['gone']);
        expect(server.ids, ['a']);
      });
    });
  });

  group('the Tasks tab', () {
    Finder chip(String label) => find.widgetWithText(ChoiceChip, label);

    /// The rows scroll sideways, so a chip on the far right has to be brought into view first, as a thumb would.
    Future<void> tapChip(WidgetTester tester, String label) async {
      await tester.ensureVisible(chip(label));
      await tester.pumpAndSettle();
      await tester.tap(chip(label));
      await tester.pumpAndSettle();
    }

    testWidgets('lists the campaigns, newest filters last asked for nothing yet', (tester) async {
      await show(tester, const CampaignsScreen());

      expect(find.text('Brew Bar'), findsOneWidget);
      expect(repository.browses.single.sort, 'featured');
      expect(repository.browses.single.type, isNull);
      expect(repository.browses.single.search, isNull);
    });

    testWidgets('asks the server for the order the person picks', (tester) async {
      await show(tester, const CampaignsScreen());

      await tapChip(tester, 'Highest reward');

      expect(repository.browses.last.sort, 'highest_reward');
      expect(tester.widget<ChoiceChip>(chip('Highest reward')).selected, isTrue);
      expect(tester.widget<ChoiceChip>(chip('Featured')).selected, isFalse);
    });

    testWidgets('asks for one kind of campaign, and back to every kind', (tester) async {
      await show(tester, const CampaignsScreen());

      await tapChip(tester, 'Follow');
      expect(repository.browses.last.type, 'SOCIAL_FOLLOW');

      await tapChip(tester, 'All');
      expect(repository.browses.last.type, isNull);
    });

    testWidgets('shows no chip for a kind merchants can not create today', (tester) async {
      await show(tester, const CampaignsScreen());

      expect(find.widgetWithText(ChoiceChip, 'Feedback'), findsOneWidget);
      expect(find.widgetWithText(ChoiceChip, 'Share'), findsOneWidget);
      expect(find.widgetWithText(ChoiceChip, 'Follow'), findsOneWidget);
      for (final hidden in ['Survey', 'Video', 'Website', 'App install', 'Referral', 'Other']) {
        expect(find.widgetWithText(ChoiceChip, hidden), findsNothing);
      }
    });

    testWidgets('keeps the order and kind together with a search', (tester) async {
      await show(tester, const CampaignsScreen());
      await tapChip(tester, 'Newest');
      await tapChip(tester, 'Feedback');

      await tester.enterText(find.byType(TextField), '  cafe  ');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      final last = repository.browses.last;
      expect((last.sort, last.type, last.search), ('newest', 'REVIEW', 'cafe'));
    });

    testWidgets('clears the search with one tap, and lists everything again', (tester) async {
      await show(tester, const CampaignsScreen());
      await tester.enterText(find.byType(TextField), 'cafe');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(repository.browses.last.search, 'cafe');

      await tester.tap(find.byTooltip('Clear search'));
      await tester.pumpAndSettle();

      expect(repository.browses.last.search, isNull);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
      expect(find.byTooltip('Clear search'), findsNothing);
    });

    testWidgets('says nothing matched, and clears every filter in one tap', (tester) async {
      repository.browseResult = [];
      await show(tester, const CampaignsScreen());
      expect(find.text('No campaigns right now'), findsOneWidget);

      await tapChip(tester, 'Share');
      expect(find.text('No campaigns match'), findsOneWidget);

      await tester.tap(find.text('Clear filters'));
      await tester.pumpAndSettle();

      expect(repository.browses.last.type, isNull);
      expect(repository.browses.last.sort, 'featured');
      expect(find.text('No campaigns right now'), findsOneWidget);
    });

    testWidgets('offers to try again when the list could not be loaded', (tester) async {
      repository.browseFailure = const Result.failure(NetworkFailure());
      await show(tester, const CampaignsScreen());
      expect(find.text('Try again'), findsOneWidget);

      repository.browseFailure = null;
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(find.text('Brew Bar'), findsOneWidget);
    });

    testWidgets('shows the saved campaigns from the bookmark, and hides the search and filters there', (tester) async {
      savedBefore(['s1']);
      repository.byId['s1'] = Result.success(_campaign('s1', title: 'Saved Cafe'));
      await show(tester, const CampaignsScreen());
      expect(find.text('Brew Bar'), findsOneWidget);

      await tester.tap(find.byTooltip('Show saved campaigns'));
      await tester.pumpAndSettle();

      expect(find.text('Saved Cafe'), findsOneWidget);
      expect(find.text('Brew Bar'), findsNothing);
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Saved'), findsOneWidget);

      await tester.tap(find.byTooltip('Show all campaigns'));
      await tester.pumpAndSettle();
      expect(find.text('Brew Bar'), findsOneWidget);
    });

    testWidgets('says nothing is saved yet, and how to save', (tester) async {
      await show(tester, const CampaignsScreen());

      await tester.tap(find.byTooltip('Show saved campaigns'));
      await tester.pumpAndSettle();

      expect(find.text('Nothing saved yet'), findsOneWidget);
      expect(find.textContaining('Tap the bookmark'), findsOneWidget);
    });

    testWidgets('does not let a search on this tab change what Home shows', (tester) async {
      final container = await show(tester, const CampaignsScreen());
      await tester.enterText(find.byType(TextField), 'cafe');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      await container.read(campaignsProvider('featured').future);
      await container.read(campaignsProvider('popular').future);

      final homeCalls = repository.browses.where(
        (b) => b.search == null && (b.sort == 'featured' || b.sort == 'popular'),
      );
      expect(homeCalls, isNotEmpty);
      expect(repository.browses.where((b) => b.search == 'cafe').single.sort, 'featured');
      expect(repository.browses.last.search, isNull);
    });
  });

  group('the Tasks tab, a page at a time', () {
    List<CampaignModel> many(int count) => [for (var i = 1; i <= count; i++) _campaign('c$i', title: 'Campaign $i')];

    /// The screen keeps the list alive while it shows. A test that waits between steps does the same, or the provider
    /// disposes itself while nobody is listening.
    ProviderContainer listening() {
      final container = makeContainer();
      container.listen(browseCampaignsProvider, (previous, next) {});
      return container;
    }

    Future<PagedList<CampaignModel>> loaded(ProviderContainer container) async =>
        (await container.read(browseCampaignsProvider.future)).valueOrNull!;

    PagedList<CampaignModel> now(ProviderContainer container) =>
        container.read(browseCampaignsProvider).value!.valueOrNull!;

    test('starts with the first page and knows more are waiting', () async {
      repository.browseResult = many(45);
      final container = listening();

      final list = await loaded(container);

      expect(list.items, hasLength(BrowseCampaignsNotifier.pageSize));
      expect(list.total, 45);
      expect(list.hasMore, isTrue);
      expect(repository.browses.map((b) => b.page), [1]);
    });

    test('adds each next page below, with the same filters, and stops at the end', () async {
      repository.browseResult = many(45);
      final container = listening();
      container.read(campaignBrowseFilterProvider.notifier).setSort(CampaignSort.newest);
      await loaded(container);

      await container.read(browseCampaignsProvider.notifier).loadMore();
      await container.read(browseCampaignsProvider.notifier).loadMore();
      await container.read(browseCampaignsProvider.notifier).loadMore();

      final list = now(container);
      expect(list.items.map((c) => c.id), [for (var i = 1; i <= 45; i++) 'c$i']);
      expect(list.hasMore, isFalse);
      // The list started on the default order before the sort changed; after that, one ask per page, and nothing more
      // once everything is in.
      final newest = repository.browses.skipWhile((b) => b.sort != 'newest');
      expect(newest.map((b) => b.page), [1, 2, 3]);
      expect(newest.map((b) => b.sort).toSet(), {'newest'});
    });

    test('asks for one page at a time, however often the end is reached', () async {
      repository.browseResult = many(45);
      repository.hold = Completer<void>();
      final container = listening();
      await loaded(container);

      final first = container.read(browseCampaignsProvider.notifier).loadMore();
      unawaited(container.read(browseCampaignsProvider.notifier).loadMore());
      expect(now(container).loadingMore, isTrue);
      repository.hold!.complete();
      await first;

      expect(repository.browses.map((b) => b.page), [1, 2]);
      expect(now(container).items, hasLength(40));
    });

    test('drops a page that arrives after the filters changed, and starts the new list from the first page', () async {
      repository.browseResult = many(45);
      repository.hold = Completer<void>();
      final container = listening();
      await loaded(container);

      final coming = container.read(browseCampaignsProvider.notifier).loadMore();
      container.read(campaignBrowseFilterProvider.notifier).setCategory(CampaignCategory.survey);
      await loaded(container);
      repository.hold!.complete();
      await coming;

      expect(now(container).items, hasLength(BrowseCampaignsNotifier.pageSize));
      expect(now(container).loadingMore, isFalse);
      expect(repository.browses.last.page, 1);
      expect(repository.browses.last.type, 'SURVEY');
    });

    test('keeps what is shown when the next page fails, says why, and tries again', () async {
      repository.browseResult = many(25);
      repository.failLaterPages = const NetworkFailure('No internet connection');
      final container = listening();
      await loaded(container);

      await container.read(browseCampaignsProvider.notifier).loadMore();

      expect(now(container).items, hasLength(20));
      expect(now(container).loadMoreMessage, 'No internet connection');
      expect(now(container).loadingMore, isFalse);

      repository.failLaterPages = null;
      await container.read(browseCampaignsProvider.notifier).loadMore();

      expect(now(container).items, hasLength(25));
      expect(now(container).loadMoreMessage, isNull);
    });

    testWidgets('brings in the next pages as the person scrolls, and says how many there are at the end', (
      tester,
    ) async {
      repository.browseResult = many(45);
      await show(tester, const CampaignsScreen());
      expect(find.text('Campaign 21'), findsNothing);

      await tester.dragUntilVisible(find.text('45 campaigns'), find.byType(ListView), const Offset(0, -600));
      await tester.pumpAndSettle();

      expect(repository.browses.map((b) => b.page), [1, 2, 3]);
      expect(find.text('45 campaigns'), findsOneWidget);
    });

    testWidgets('offers to load more by hand after a failure', (tester) async {
      repository.browseResult = many(25);
      repository.failLaterPages = const NetworkFailure('No internet connection');
      await show(tester, const CampaignsScreen());

      // On this tall test screen the first page fits without scrolling, so nothing asks for more until the button.
      await tester.dragUntilVisible(find.text('Load more'), find.byType(ListView), const Offset(0, -600));
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      expect(find.text('No internet connection'), findsOneWidget);
      expect(find.text('Campaign 20'), findsOneWidget);

      repository.failLaterPages = null;
      await tester.tap(find.text('Load more'));
      await tester.pumpAndSettle();
      await tester.dragUntilVisible(find.text('25 campaigns'), find.byType(ListView), const Offset(0, -600));

      expect(find.text('Campaign 25'), findsOneWidget);
      expect(find.text('No internet connection'), findsNothing);
    });
  });

  group('PagedList', () {
    PaginatedResponse<CampaignModel> page(List<String> ids, {required int total}) =>
        PaginatedResponse(items: [for (final id in ids) _campaign(id)], total: total, page: 1, limit: 2);

    test('skips an item the next page repeats, when the list shifted on the server between pages', () {
      final first = PagedList<CampaignModel>.first(page(['a', 'b'], total: 4));

      final next = first.append(page(['b', 'c'], total: 4), idOf: (c) => c.id);

      expect(next.items.map((c) => c.id), ['a', 'b', 'c']);
      expect(next.page, 2);
      expect(next.hasMore, isTrue);
    });

    test('treats an empty page as the end, even if the count says more', () {
      final first = PagedList<CampaignModel>.first(page(['a', 'b'], total: 4));

      final next = first.append(page([], total: 4), idOf: (c) => c.id);

      expect(next.hasMore, isFalse);
      expect(next.total, 2);
    });
  });

  group('the campaign page', () {
    testWidgets('shows a campaign that was never in any list, fetched by its own id', (tester) async {
      repository.browseResult = [];
      repository.byId['deep'] = Result.success(_campaign('deep', title: 'From A Notification'));

      await show(tester, const CampaignDetailScreen(campaignId: 'deep'));

      expect(find.text('From A Notification'), findsWidgets);
      expect(find.text('Tell us honestly how your visit went.'), findsOneWidget);
      expect(repository.fetched, ['deep']);
    });

    testWidgets('says so when the campaign has ended, instead of showing an empty page', (tester) async {
      repository.byId['old'] = const Result.failure(NotFoundFailure());

      await show(tester, const CampaignDetailScreen(campaignId: 'old'));

      expect(find.text('This campaign is no longer available'), findsOneWidget);
      expect(find.byTooltip('Share'), findsNothing);
      expect(find.byTooltip('Save for later'), findsNothing);
    });

    testWidgets('offers to try again on a connection problem, and shows the campaign then', (tester) async {
      repository.byId['c9'] = const Result.failure(NetworkFailure());
      await show(tester, const CampaignDetailScreen(campaignId: 'c9'));
      expect(find.text('Try again'), findsWidgets);

      repository.byId['c9'] = Result.success(_campaign('c9', title: 'Back Online'));
      await tester.tap(find.text('Try again').first);
      await tester.pumpAndSettle();

      expect(find.text('Back Online'), findsWidgets);
    });

    testWidgets('lists the tasks', (tester) async {
      repository.tasks = const [
        CampaignTaskModel(
          id: 't1',
          campaignId: 'c1',
          title: 'Write an honest review',
          taskType: 'TEXT',
          verificationType: 'MANUAL',
        ),
      ];

      await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      expect(find.text('Write an honest review'), findsOneWidget);
    });

    testWidgets('saves with the bookmark, says so, and removes it on the next tap', (tester) async {
      final container = await show(tester, const CampaignDetailScreen(campaignId: 'c1'));
      expect(find.byTooltip('Save for later'), findsOneWidget);

      await tester.tap(find.byTooltip('Save for later'));
      await tester.pumpAndSettle();

      expect(container.read(savedCampaignIdsProvider), ['c1']);
      expect(store.saved, ['c1']);
      expect(find.textContaining('Saved.'), findsOneWidget);
      expect(find.byTooltip('Remove from saved'), findsOneWidget);

      await tester.tap(find.byTooltip('Remove from saved'));
      await tester.pumpAndSettle();

      expect(container.read(savedCampaignIdsProvider), isEmpty);
      expect(find.text('Removed from saved.'), findsOneWidget);
    });

    testWidgets('shows a campaign as saved when it already was', (tester) async {
      savedBefore(['c1']);

      await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      expect(find.byTooltip('Remove from saved'), findsOneWidget);
    });

    testWidgets('says the saved list is full, and does not save', (tester) async {
      savedBefore([for (var i = 0; i < SavedCampaignsStore.maxSaved; i++) 'x$i']);
      final container = await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      await tester.tap(find.byTooltip('Save for later'));
      await tester.pumpAndSettle();

      expect(find.textContaining('up to 30'), findsOneWidget);
      expect(container.read(savedCampaignIdsProvider), isNot(contains('c1')));
    });

    testWidgets('says so when the save could not reach the server, and leaves the bookmark empty', (tester) async {
      server.failure = const NetworkFailure();
      final container = await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      await tester.tap(find.byTooltip('Save for later'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Check your connection'), findsOneWidget);
      expect(find.byTooltip('Save for later'), findsOneWidget);
      expect(container.read(savedCampaignIdsProvider), isEmpty);
    });

    testWidgets('shares the campaign with the person’s referral code', (tester) async {
      await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      await tester.tap(find.byTooltip('Share'));
      await tester.pumpAndSettle();

      expect(shared, hasLength(1));
      expect(shared.single, contains('Brew Bar'));
      expect(shared.single, contains('ASHA123'));
    });
  });
}
