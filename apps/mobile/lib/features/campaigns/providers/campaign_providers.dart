import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/errors/failure.dart';
import '../../../core/location/location_coordinates.dart';
import '../../../core/location/location_providers.dart';
import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/models/paged_list.dart';
import '../../../shared/providers/core_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../data/campaign_repository.dart';
import '../data/models/campaign_browse.dart';
import '../data/models/campaign_model.dart';
import '../data/models/campaign_progress_model.dart';
import '../data/models/campaign_task_model.dart';
import '../data/saved_campaigns_repository.dart';
import '../data/saved_campaigns_store.dart';

final campaignRepositoryProvider = Provider<CampaignRepository>((ref) {
  return CampaignRepository(ref.watch(dioProvider));
});

/// Keyed by sort mode ('featured' | 'popular') so Home can hold a featured
/// list and a popular row independently without one invalidating the other.
/// Home has no search or filters, and nothing typed on the Tasks tab reaches it.
final campaignsProvider = FutureProvider.autoDispose.family<Result<PaginatedResponse<CampaignModel>>, String>((
  ref,
  sort,
) async {
  return ref.watch(campaignRepositoryProvider).browsePublic(sort: sort);
});

/// One campaign by id, for its detail page, wherever the person came from: a search result, the popular row, a
/// notification, or the saved list. It does not depend on the campaign having been in some list already.
final campaignProvider = FutureProvider.autoDispose.family<Result<CampaignModel>, String>((ref, campaignId) async {
  return ref.watch(campaignRepositoryProvider).getPublicCampaign(campaignId);
});

final campaignTasksProvider = FutureProvider.autoDispose.family<Result<List<CampaignTaskModel>>, String>((
  ref,
  campaignId,
) async {
  return ref.watch(campaignRepositoryProvider).getTasks(campaignId);
});

/// The signed-in person's progress on a campaign's tasks. Refreshed after a submission (TaskSubmissionScreen), so a
/// task just sent shows as in review rather than open.
final campaignProgressProvider = FutureProvider.autoDispose.family<Result<CampaignProgressModel>, String>((
  ref,
  campaignId,
) async {
  return ref.watch(campaignRepositoryProvider).getProgress(campaignId);
});

/// The person's joined campaigns, under way or completed, for the My Campaigns screen.
final joinedCampaignsProvider = FutureProvider.autoDispose
    .family<Result<PaginatedResponse<JoinedCampaignModel>>, JoinedCampaignFilter>((ref, filter) async {
      return ref.watch(campaignRepositoryProvider).getJoinedCampaigns(filter);
    });

// --- The Tasks tab: sort, category, search --------------------------------------------------------------------------

/// What the person has asked the Tasks tab to show. Scoped to the screen, so it starts fresh each time.
final campaignBrowseFilterProvider = NotifierProvider.autoDispose<CampaignBrowseFilterNotifier, CampaignBrowseFilter>(
  CampaignBrowseFilterNotifier.new,
);

class CampaignBrowseFilterNotifier extends Notifier<CampaignBrowseFilter> {
  @override
  CampaignBrowseFilter build() => const CampaignBrowseFilter();

  /// Any sort but "Nearest", which needs the phone's location: see [sortByNearest].
  void setSort(CampaignSort sort) {
    if (sort == CampaignSort.nearest) return;
    state = state.copyWith(sort: sort, clearNear: true);
  }

  /// Sorts by distance from where the phone is. This is the only place the list asks for location, so the system
  /// prompt appears when the person chooses "Nearest", never before. Without a location (refused, or location turned
  /// off) the sort stays as it was and the failure says why.
  Future<Failure?> sortByNearest() async {
    final result = await ref.read(locationServiceProvider).getCurrentLocation();
    if (!ref.mounted) return null;
    return result.when(
      success: (position) {
        state = state.copyWith(sort: CampaignSort.nearest, near: position);
        return null;
      },
      failure: (failure) => failure,
    );
  }

  /// Null shows every kind.
  void setCategory(CampaignCategory? category) =>
      state = category == null ? state.copyWith(clearCategory: true) : state.copyWith(category: category);

  void setSearch(String search) => state = state.copyWith(search: search.trim());

  void setSavedOnly(bool savedOnly) => state = state.copyWith(savedOnly: savedOnly);

  /// Back to everything, in the default order. Keeps whether the saved view is showing.
  void clear() => state = CampaignBrowseFilter(savedOnly: state.savedOnly);
}

/// The search box's text. Kept here, and cleaned up with the screen, so the screen needs no state of its own.
final campaignSearchControllerProvider = Provider.autoDispose<TextEditingController>((ref) {
  final controller = TextEditingController(text: ref.read(campaignBrowseFilterProvider).search);
  ref.onDispose(controller.dispose);
  return controller;
});

/// The list for the current sort, category and search, a page at a time. Changing any of them starts again from the
/// first page. The saved view does not use it.
final browseCampaignsProvider =
    AsyncNotifierProvider.autoDispose<BrowseCampaignsNotifier, Result<PagedList<CampaignModel>>>(
      BrowseCampaignsNotifier.new,
    );

class BrowseCampaignsNotifier extends AsyncNotifier<Result<PagedList<CampaignModel>>> {
  static const pageSize = 20;

  /// The part of the filter that decides what the server sends; whether the saved view is showing does not.
  (CampaignSort, CampaignCategory?, String, LocationCoordinates?) _query() {
    final filter = ref.read(campaignBrowseFilterProvider);
    return (filter.sort, filter.category, filter.search, filter.near);
  }

  @override
  Future<Result<PagedList<CampaignModel>>> build() async {
    ref.watch(
      campaignBrowseFilterProvider.select((filter) => (filter.sort, filter.category, filter.search, filter.near)),
    );
    final result = await _fetch(_query(), page: 1);
    return result.map(PagedList<CampaignModel>.first);
  }

  Future<Result<PaginatedResponse<CampaignModel>>> _fetch(
    (CampaignSort, CampaignCategory?, String, LocationCoordinates?) query, {
    required int page,
  }) {
    final (sort, category, search, near) = query;
    return ref
        .read(campaignRepositoryProvider)
        .browsePublic(
          page: page,
          limit: pageSize,
          sort: sort.apiValue,
          campaignType: category?.apiValue,
          search: search.isEmpty ? null : search,
          latitude: sort == CampaignSort.nearest ? near?.latitude : null,
          longitude: sort == CampaignSort.nearest ? near?.longitude : null,
        );
  }

  /// Fetches the next page and adds it below. Does nothing when everything is loaded or a page is already coming.
  Future<void> loadMore() async {
    final current = state.value?.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;

    final query = _query();
    state = AsyncData(Result.success(current.copyWith(loadingMore: true, clearMessage: true)));
    final result = await _fetch(query, page: current.page + 1);
    if (!ref.mounted) return;

    // If the search or a chip changed while the page was coming, the list has already started over; this page belongs
    // to the old one and must not be added to the new one.
    final latest = state.value?.valueOrNull;
    if (latest == null || !latest.loadingMore || _query() != query) return;

    state = AsyncData(
      Result.success(
        result.when(
          success: (page) => latest.append(page, idOf: (campaign) => campaign.id),
          failure: (failure) => latest.copyWith(
            loadingMore: false,
            loadMoreMessage: failure.message.isEmpty ? 'Could not load more. Please try again.' : failure.message,
          ),
        ),
      ),
    );
  }
}

// --- Saved campaigns ------------------------------------------------------------------------------------------------

final savedCampaignsStoreProvider = Provider<SavedCampaignsStore>((ref) {
  return SavedCampaignsStore(ref.watch(settingsBoxProvider));
});

final savedCampaignsRepositoryProvider = Provider<SavedCampaignsRepository>((ref) {
  return SavedCampaignsRepository(ref.watch(dioProvider));
});

/// What happened when the person tapped save.
enum SaveOutcome {
  saved,
  removed,
  listFull,

  /// The campaign has ended or was taken down, so it can not be saved any more.
  unavailable,

  /// The server could not be reached. Nothing changed.
  failed,
}

/// The ids of the campaigns the signed-in person saved, newest first. Empty when nobody is signed in.
///
/// The server holds the list, so it follows the person to another phone. This phone keeps a copy so the bookmark shows
/// at once; the server's list replaces the copy as soon as it arrives.
final savedCampaignIdsProvider = NotifierProvider<SavedCampaignIdsNotifier, List<String>>(SavedCampaignIdsNotifier.new);

class SavedCampaignIdsNotifier extends Notifier<List<String>> {
  String? _userId;

  /// Counts the person's own changes, so a slower answer from the server never undoes a newer tap.
  var _changes = 0;

  @override
  List<String> build() {
    final userId = ref.watch(authStateProvider.select((auth) => auth.value?.id));
    _userId = userId;
    if (userId == null) return const [];
    // After build: the state can not be set while it is still being built.
    unawaited(Future.microtask(() => _sync(userId)));
    return ref.read(savedCampaignsStoreProvider).idsFor(userId);
  }

  /// Saves the campaign, or takes it off the list if it is already there.
  ///
  /// The bookmark changes at once; if the server then says no, the change is undone and the outcome says why.
  Future<SaveOutcome> toggle(String campaignId) async {
    final userId = _userId;
    if (userId == null) return SaveOutcome.failed;
    final removing = state.contains(campaignId);
    if (!removing && state.length >= SavedCampaignsStore.maxSaved) return SaveOutcome.listFull;

    final position = state.indexOf(campaignId);
    await _change(userId, removing ? _without(state, {campaignId}) : [campaignId, ...state]);
    final change = _changes;

    final repository = ref.read(savedCampaignsRepositoryProvider);
    final result = removing ? await repository.remove(campaignId) : await repository.save(campaignId);
    if (!ref.mounted || _userId != userId) return removing ? SaveOutcome.removed : SaveOutcome.saved;

    return result.when(
      success: (ids) {
        if (change == _changes) _accept(userId, ids);
        return removing ? SaveOutcome.removed : SaveOutcome.saved;
      },
      failure: (failure) {
        // Undo only this campaign's change: the person may have tapped others since.
        if (removing) {
          final restored = [...state]..insert(position.clamp(0, state.length), campaignId);
          unawaited(_change(userId, restored));
        } else {
          unawaited(_change(userId, _without(state, {campaignId})));
        }
        return switch (failure) {
          NotFoundFailure() => SaveOutcome.unavailable,
          // The only reason the server refuses a valid save: the list on the server is already full.
          ValidationFailure() when !removing => SaveOutcome.listFull,
          _ => SaveOutcome.failed,
        };
      },
    );
  }

  /// Drops campaigns that have ended. The server is told too, but the saved view does not wait for it.
  Future<void> forget(Iterable<String> campaignIds) async {
    final userId = _userId;
    final gone = campaignIds.toSet();
    if (userId == null || gone.isEmpty) return;
    await _change(userId, _without(state, gone));
    final repository = ref.read(savedCampaignsRepositoryProvider);
    for (final id in gone) {
      unawaited(repository.remove(id));
    }
  }

  /// Uploads what this phone saved before saving moved to the server (once), then takes the server's list.
  Future<void> _sync(String userId) async {
    final store = ref.read(savedCampaignsStoreProvider);
    final repository = ref.read(savedCampaignsRepositoryProvider);
    final change = _changes;

    final legacy = store.legacyIds;
    var result = legacy.isEmpty ? await repository.list() : await repository.importIds(legacy);
    if (legacy.isNotEmpty) {
      final failure = result.failureOrNull;
      // Kept for next time only when the server could not be reached; anything else would fail again forever.
      if (failure is! NetworkFailure && failure is! ServerFailure) await store.clearLegacy();
      if (failure != null) result = await repository.list();
    }

    if (!ref.mounted || _userId != userId || change != _changes) return;
    final ids = result.valueOrNull;
    if (ids != null) _accept(userId, ids);
  }

  /// The server's list, which is the real one.
  void _accept(String userId, List<String> ids) {
    if (listEquals(ids, state)) return;
    state = ids;
    unawaited(ref.read(savedCampaignsStoreProvider).writeFor(userId, ids));
  }

  /// The screen changes first, so the bookmark responds at once, and the phone's copy catches up.
  Future<void> _change(String userId, List<String> ids) async {
    _changes++;
    state = ids;
    await ref.read(savedCampaignsStoreProvider).writeFor(userId, ids);
  }

  static List<String> _without(List<String> ids, Set<String> remove) => [
    for (final id in ids)
      if (!remove.contains(id)) id,
  ];
}

/// The saved campaigns themselves, fetched now so an ended campaign is not shown from an old copy.
///
/// A campaign the server no longer has (it ended, or was taken down) is dropped from the saved list for good. One
/// that could not be fetched only because of a connection problem is kept, and is simply missing from this view.
final savedCampaignsProvider = FutureProvider.autoDispose<Result<List<CampaignModel>>>((ref) async {
  final ids = ref.watch(savedCampaignIdsProvider);
  if (ids.isEmpty) return const Result.success([]);

  final repository = ref.watch(campaignRepositoryProvider);
  final results = await Future.wait(ids.map(repository.getPublicCampaign));

  final found = <CampaignModel>[];
  final gone = <String>[];
  Failure? connectionProblem;
  for (var i = 0; i < ids.length; i++) {
    results[i].when(
      success: found.add,
      failure: (failure) {
        if (failure is NotFoundFailure) {
          gone.add(ids[i]);
        } else {
          connectionProblem ??= failure;
        }
      },
    );
  }

  if (gone.isNotEmpty) {
    // After this provider has finished: changing the ids while it is still being built would loop.
    unawaited(
      Future.microtask(() async {
        if (ref.mounted) await ref.read(savedCampaignIdsProvider.notifier).forget(gone);
      }),
    );
  }
  final problem = connectionProblem;
  if (found.isEmpty && problem != null) return Result.failure(problem);
  return Result.success(found);
});

// --- Sharing --------------------------------------------------------------------------------------------------------

/// Opens the phone's share sheet. A provider so a test can stand in for it.
final shareTextProvider = Provider<Future<void> Function(String text)>((ref) {
  return (text) => SharePlus.instance.share(ShareParams(text: text));
});
