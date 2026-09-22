import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/errors/failure.dart';
import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/campaign_repository.dart';
import '../data/models/campaign_browse.dart';
import '../data/models/campaign_model.dart';
import '../data/models/campaign_task_model.dart';
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

// --- The Tasks tab: sort, category, search --------------------------------------------------------------------------

/// What the person has asked the Tasks tab to show. Scoped to the screen, so it starts fresh each time.
final campaignBrowseFilterProvider = NotifierProvider.autoDispose<CampaignBrowseFilterNotifier, CampaignBrowseFilter>(
  CampaignBrowseFilterNotifier.new,
);

class CampaignBrowseFilterNotifier extends Notifier<CampaignBrowseFilter> {
  @override
  CampaignBrowseFilter build() => const CampaignBrowseFilter();

  void setSort(CampaignSort sort) => state = state.copyWith(sort: sort);

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

/// The list for the current sort, category and search. The saved view does not use it.
final browseCampaignsProvider = FutureProvider.autoDispose<Result<PaginatedResponse<CampaignModel>>>((ref) async {
  final (sort, category, search) = ref.watch(
    campaignBrowseFilterProvider.select((filter) => (filter.sort, filter.category, filter.search)),
  );
  return ref
      .watch(campaignRepositoryProvider)
      .browsePublic(sort: sort.apiValue, campaignType: category?.apiValue, search: search.isEmpty ? null : search);
});

// --- Saved campaigns ------------------------------------------------------------------------------------------------

final savedCampaignsStoreProvider = Provider<SavedCampaignsStore>((ref) {
  return SavedCampaignsStore(ref.watch(settingsBoxProvider));
});

/// What happened when the person tapped save.
enum SaveOutcome { saved, removed, listFull }

/// The ids of the campaigns the person saved, newest first.
final savedCampaignIdsProvider = NotifierProvider<SavedCampaignIdsNotifier, List<String>>(SavedCampaignIdsNotifier.new);

class SavedCampaignIdsNotifier extends Notifier<List<String>> {
  @override
  List<String> build() => ref.read(savedCampaignsStoreProvider).ids;

  /// Saves the campaign, or takes it off the list if it is already there.
  Future<SaveOutcome> toggle(String campaignId) async {
    if (state.contains(campaignId)) {
      await _set([
        for (final id in state)
          if (id != campaignId) id,
      ]);
      return SaveOutcome.removed;
    }
    if (state.length >= SavedCampaignsStore.maxSaved) return SaveOutcome.listFull;
    await _set([campaignId, ...state]);
    return SaveOutcome.saved;
  }

  Future<void> forget(Iterable<String> campaignIds) async {
    final gone = campaignIds.toSet();
    if (gone.isEmpty) return;
    await _set([
      for (final id in state)
        if (!gone.contains(id)) id,
    ]);
  }

  /// The screen changes first, so the bookmark responds at once, and the phone's storage catches up.
  Future<void> _set(List<String> ids) async {
    state = ids;
    await ref.read(savedCampaignsStoreProvider).write(ids);
  }
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
