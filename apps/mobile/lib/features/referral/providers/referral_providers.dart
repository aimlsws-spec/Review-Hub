import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/referral_model.dart';
import '../data/referral_repository.dart';

final referralRepositoryProvider = Provider<ReferralRepository>((ref) {
  return ReferralRepository(ref.watch(dioProvider));
});

final referralStatsProvider = FutureProvider.autoDispose<Result<ReferralStatsModel>>((ref) async {
  return ref.watch(referralRepositoryProvider).getStats();
});

final myReferralsProvider =
    FutureProvider.autoDispose<Result<PaginatedResponse<ReferralModel>>>((ref) async {
  return ref.watch(referralRepositoryProvider).listMine();
});
