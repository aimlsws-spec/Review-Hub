import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/marketplace_repository.dart';
import '../data/models/marketplace_item_model.dart';
import '../data/models/redemption_model.dart';

final marketplaceRepositoryProvider = Provider<MarketplaceRepository>((ref) {
  return MarketplaceRepository(ref.watch(dioProvider));
});

/// Bumped after a successful redemption so the catalogue (stock) and
/// redemption history refetch.
final marketplaceRefreshProvider = StateProvider<int>((ref) => 0);

final marketplaceItemsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<MarketplaceItemModel>>>((ref) async {
  ref.watch(marketplaceRefreshProvider);
  return ref.watch(marketplaceRepositoryProvider).getItems();
});

final myRedemptionsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<RedemptionModel>>>((ref) async {
  ref.watch(marketplaceRefreshProvider);
  return ref.watch(marketplaceRepositoryProvider).getMyRedemptions();
});
