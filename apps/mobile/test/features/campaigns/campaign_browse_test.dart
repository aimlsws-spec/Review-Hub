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
import 'package:viral_kar/features/campaigns/data/saved_campaigns_store.dart';
import 'package:viral_kar/features/campaigns/presentation/screens/campaign_detail_screen.dart';
import 'package:viral_kar/features/campaigns/presentation/screens/campaigns_screen.dart';
import 'package:viral_kar/features/campaigns/providers/campaign_providers.dart';
import 'package:viral_kar/shared/models/api_response.dart';

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
  _Browse({this.sort, this.type, this.search});

  final String? sort;
  final String? type;
  final String? search;
}

/// Stands in for the server: serves the campaigns the test sets, and records what was asked.
class _FakeCampaignRepository extends Fake implements CampaignRepository {
  List<CampaignModel> browseResult = [_campaign('c1', title: 'Brew Bar')];
  Result<PaginatedResponse<CampaignModel>>? browseFailure;
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
  }) async {
    browses.add(_Browse(sort: sort, type: campaignType, search: search));
    return browseFailure ??
        Result.success(PaginatedResponse(items: browseResult, total: browseResult.length, page: 1, limit: 20));
  }

  @override
  Future<Result<CampaignModel>> getPublicCampaign(String campaignId) async {
    fetched.add(campaignId);
    return byId[campaignId] ?? Result.success(_campaign(campaignId));
  }

  @override
  Future<Result<List<CampaignTaskModel>>> getTasks(String campaignId) async => Result.success(tasks);
}

class _MemorySavedStore implements SavedCampaignsStore {
  _MemorySavedStore([List<String>? initial]) : saved = [...?initial];

  List<String> saved;

  @override
  List<String> get ids => saved;

  @override
  Future<void> write(List<String> ids) async => saved = [...ids];
}

class _FakeAuth extends AuthStateNotifier {
  @override
  Future<UserModel?> build() async =>
      const UserModel(id: 'u1', firstName: 'Asha', lastName: 'Patel', status: 'ACTIVE', referralCode: 'ASHA123');
}

void main() {
  late _FakeCampaignRepository repository;
  late _MemorySavedStore store;
  late List<String> shared;

  setUp(() {
    repository = _FakeCampaignRepository();
    store = _MemorySavedStore();
    shared = [];
  });

  ProviderContainer makeContainer() {
    final container = ProviderContainer(
      overrides: [
        campaignRepositoryProvider.overrideWithValue(repository),
        savedCampaignsStoreProvider.overrideWithValue(store),
        shareTextProvider.overrideWithValue((text) async => shared.add(text)),
        authStateProvider.overrideWith(_FakeAuth.new),
      ],
    );
    addTearDown(container.dispose);
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
      final container = makeContainer();
      final notifier = container.read(savedCampaignIdsProvider.notifier);

      expect(await notifier.toggle('a'), SaveOutcome.saved);
      expect(await notifier.toggle('b'), SaveOutcome.saved);
      expect(container.read(savedCampaignIdsProvider), ['b', 'a']);
      expect(store.saved, ['b', 'a']);

      expect(await notifier.toggle('b'), SaveOutcome.removed);
      expect(container.read(savedCampaignIdsProvider), ['a']);
      expect(store.saved, ['a']);
    });

    test('starts from what was saved before', () {
      store = _MemorySavedStore(['x', 'y']);

      expect(makeContainer().read(savedCampaignIdsProvider), ['x', 'y']);
    });

    test('stops at the limit, so the saved view stays quick to open, and says so', () async {
      store = _MemorySavedStore([for (var i = 0; i < SavedCampaignsStore.maxSaved; i++) 'c$i']);
      final container = makeContainer();

      expect(await container.read(savedCampaignIdsProvider.notifier).toggle('one-more'), SaveOutcome.listFull);
      expect(container.read(savedCampaignIdsProvider), hasLength(SavedCampaignsStore.maxSaved));
      expect(await container.read(savedCampaignIdsProvider.notifier).toggle('c0'), SaveOutcome.removed);
    });

    test('fetches each saved campaign fresh', () async {
      store = _MemorySavedStore(['a', 'b']);
      final container = makeContainer();

      final result = await container.read(savedCampaignsProvider.future);

      expect(result.valueOrNull!.map((c) => c.id), ['a', 'b']);
      expect(repository.fetched, ['a', 'b']);
    });

    test('drops a campaign that has ended from the saved list for good, and keeps the rest', () async {
      store = _MemorySavedStore(['a', 'gone', 'b']);
      repository.byId['gone'] = const Result.failure(NotFoundFailure());
      final container = makeContainer();

      final result = await container.read(savedCampaignsProvider.future);
      await Future<void>.delayed(Duration.zero);

      expect(result.valueOrNull!.map((c) => c.id), ['a', 'b']);
      expect(store.saved, ['a', 'b']);
    });

    test(
      'keeps a campaign it could not reach because of the connection: it is missing from the view, not lost',
      () async {
        store = _MemorySavedStore(['a', 'offline']);
        repository.byId['offline'] = const Result.failure(NetworkFailure());
        final container = makeContainer();

        final result = await container.read(savedCampaignsProvider.future);
        await Future<void>.delayed(Duration.zero);

        expect(result.valueOrNull!.map((c) => c.id), ['a']);
        expect(store.saved, ['a', 'offline']);
      },
    );

    test('reports a connection problem, and forgets nothing, when none could be reached', () async {
      store = _MemorySavedStore(['a', 'b']);
      repository.byId['a'] = const Result.failure(NetworkFailure());
      repository.byId['b'] = const Result.failure(NetworkFailure());
      final container = makeContainer();

      final result = await container.read(savedCampaignsProvider.future);

      expect(result.failureOrNull, isA<NetworkFailure>());
      expect(store.saved, ['a', 'b']);
    });

    test('is empty, without asking the server, when nothing is saved', () async {
      final result = await makeContainer().read(savedCampaignsProvider.future);

      expect(result.valueOrNull, isEmpty);
      expect(repository.fetched, isEmpty);
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

      await tapChip(tester, 'Survey');
      expect(repository.browses.last.type, 'SURVEY');

      await tapChip(tester, 'All');
      expect(repository.browses.last.type, isNull);
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

      await tapChip(tester, 'Survey');
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
      store = _MemorySavedStore(['s1']);
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
      store = _MemorySavedStore(['c1']);

      await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      expect(find.byTooltip('Remove from saved'), findsOneWidget);
    });

    testWidgets('says the saved list is full, and does not save', (tester) async {
      store = _MemorySavedStore([for (var i = 0; i < SavedCampaignsStore.maxSaved; i++) 'x$i']);
      final container = await show(tester, const CampaignDetailScreen(campaignId: 'c1'));

      await tester.tap(find.byTooltip('Save for later'));
      await tester.pumpAndSettle();

      expect(find.textContaining('up to 30'), findsOneWidget);
      expect(container.read(savedCampaignIdsProvider), isNot(contains('c1')));
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
