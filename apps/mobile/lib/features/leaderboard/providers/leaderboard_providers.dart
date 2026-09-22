import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/leaderboard_repository.dart';
import '../data/models/leaderboard_models.dart';

final leaderboardRepositoryProvider = Provider<LeaderboardRepository>((ref) {
  return LeaderboardRepository(ref.watch(dioProvider));
});

/// Which board is showing. Page-scoped: it starts on this month each time the screen opens.
final leaderboardPeriodProvider = StateProvider.autoDispose<LeaderboardPeriod>((ref) => LeaderboardPeriod.month);

/// The board for the chosen period. Changing the period loads the other board.
final leaderboardProvider = FutureProvider.autoDispose<Result<LeaderboardModel>>((ref) {
  final period = ref.watch(leaderboardPeriodProvider);
  return ref.watch(leaderboardRepositoryProvider).load(period);
});

/// Turns the person's visibility on or off. Its state is the last error message, or null when it has not failed.
final leaderboardVisibilityProvider =
    NotifierProvider.autoDispose<LeaderboardVisibilityNotifier, LeaderboardVisibilityState>(
      LeaderboardVisibilityNotifier.new,
    );

class LeaderboardVisibilityState {
  const LeaderboardVisibilityState({this.saving = false, this.error});

  final bool saving;
  final String? error;
}

class LeaderboardVisibilityNotifier extends Notifier<LeaderboardVisibilityState> {
  @override
  LeaderboardVisibilityState build() => const LeaderboardVisibilityState();

  /// Saves the choice, then reloads the board so the person's row appears or disappears.
  Future<void> setVisible(bool visible) async {
    if (state.saving) return;
    state = const LeaderboardVisibilityState(saving: true);

    final result = await ref.read(leaderboardRepositoryProvider).setVisibility(visible: visible);
    result.when(
      success: (_) {
        state = const LeaderboardVisibilityState();
        ref.invalidate(leaderboardProvider);
      },
      failure: (failure) {
        state = LeaderboardVisibilityState(
          error: failure.message.isEmpty ? 'Could not save that right now. Please try again.' : failure.message,
        );
      },
    );
  }
}
