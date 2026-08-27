import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/campaign_repository.dart';
import '../data/models/campaign_model.dart';
import '../data/models/campaign_task_model.dart';

final campaignRepositoryProvider = Provider<CampaignRepository>((ref) {
  return CampaignRepository(ref.watch(dioProvider));
});

/// The active search term for the campaigns browse screen.
final campaignSearchProvider = StateProvider<String>((ref) => '');

final campaignsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<CampaignModel>>>((ref) async {
  final search = ref.watch(campaignSearchProvider);
  return ref.watch(campaignRepositoryProvider).browsePublic(search: search.isEmpty ? null : search);
});

final campaignTasksProvider =
    FutureProvider.autoDispose.family<Result<List<CampaignTaskModel>>, String>((ref, campaignId) async {
  return ref.watch(campaignRepositoryProvider).getTasks(campaignId);
});
