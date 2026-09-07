import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/gamification_repository.dart';
import '../data/models/badge_model.dart';
import '../data/models/gamification_profile_model.dart';

final gamificationRepositoryProvider = Provider<GamificationRepository>((ref) {
  return GamificationRepository(ref.watch(dioProvider));
});

/// Bumped after claiming the daily reward so the profile (streak/XP) and
/// badge-earned state refetch.
final gamificationRefreshProvider = StateProvider<int>((ref) => 0);

final gamificationProfileProvider = FutureProvider.autoDispose<Result<GamificationProfileModel>>((ref) async {
  ref.watch(gamificationRefreshProvider);
  return ref.watch(gamificationRepositoryProvider).getProfile();
});

final badgesProvider = FutureProvider.autoDispose<Result<List<BadgeModel>>>((ref) async {
  ref.watch(gamificationRefreshProvider);
  return ref.watch(gamificationRepositoryProvider).getBadges();
});
