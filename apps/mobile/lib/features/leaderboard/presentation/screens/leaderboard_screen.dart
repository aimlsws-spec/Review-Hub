import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/leaderboard_models.dart';
import '../../providers/leaderboard_providers.dart';
import '../widgets/leaderboard_format.dart';

/// Who earned most from rewards, this month or ever. People are shown by first name and initial only, and anyone
/// can switch themselves off the board from here.
class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(leaderboardPeriodProvider);
    final boardAsync = ref.watch(leaderboardProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: const Text('Leaderboard')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(leaderboardProvider);
          await ref.read(leaderboardProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            SegmentedButton<LeaderboardPeriod>(
              segments: [
                for (final option in LeaderboardPeriod.values) ButtonSegment(value: option, label: Text(option.label)),
              ],
              selected: {period},
              showSelectedIcon: false,
              onSelectionChanged: (selection) => ref.read(leaderboardPeriodProvider.notifier).state = selection.first,
            ),
            const SizedBox(height: 16),
            boardAsync.when(
              loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 48), child: PageLoader()),
              error: (error, stack) => ErrorStateView(
                message: 'The leaderboard could not be loaded.',
                onRetry: () => ref.invalidate(leaderboardProvider),
              ),
              data: (result) => result.when(
                success: (board) => _Board(board: board),
                failure: (failure) =>
                    ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(leaderboardProvider)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Board extends StatelessWidget {
  const _Board({required this.board});

  final LeaderboardModel board;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _StandingCard(board: board),
        const SizedBox(height: 16),
        if (board.entries.isEmpty)
          const EmptyState(
            icon: Icons.emoji_events_outlined,
            title: 'Nobody is on the board yet',
            description: 'Finish a task and get your reward to be the first.',
          )
        else
          for (final entry in board.entries) _EntryRow(entry: entry),
        const SizedBox(height: 24),
        const _VisibilityCard(),
        const SizedBox(height: 12),
        const Text(
          'Only rewards that were paid to a wallet count. A reward taken back for breaking the rules is removed from the total.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.slate500, height: 1.4),
        ),
      ],
    );
  }
}

/// Where the person stands, in words that fit each situation: hidden, ranked, or not yet on the board.
class _StandingCard extends StatelessWidget {
  const _StandingCard({required this.board});

  final LeaderboardModel board;

  @override
  Widget build(BuildContext context) {
    final me = board.me;
    final thisMonth = board.period == LeaderboardPeriod.month;
    final where = thisMonth ? 'this month' : 'in total';

    final String headline;
    final String detail;
    if (!me.visible) {
      headline = 'You are hidden';
      detail = 'Only you can see this. Turn it on below to join the leaderboard.';
    } else if (me.rank == null) {
      headline = 'Not on the board yet';
      detail = thisMonth
          ? 'Finish a task and get your reward to get a rank this month.'
          : 'Finish a task and get your reward to get a rank.';
    } else {
      headline = 'You are #${me.rank}';
      detail = '${formatRupees(me.totalEarned)} earned $where';
    }

    final resetsAt = board.resetsAt;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.navy900, Color(0xFF193255)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            headline,
            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(detail, style: const TextStyle(color: Colors.white70, fontSize: 13.5, height: 1.4)),
          if (thisMonth && resetsAt != null) ...[
            const SizedBox(height: 10),
            Text(
              'Starts over on ${DateFormat('d MMM').format(resetsAt)}',
              style: const TextStyle(color: Colors.white60, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({required this.entry});

  final LeaderboardEntryModel entry;

  @override
  Widget build(BuildContext context) {
    final mine = entry.isMe;
    final name = mine ? '${entry.displayName} (you)' : entry.displayName;

    return Semantics(
      container: true,
      label: 'Rank ${entry.rank}, $name, ${formatRupees(entry.totalEarned)} earned',
      child: ExcludeSemantics(
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: mine ? AppColors.orange50 : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: mine ? AppColors.orange300 : AppColors.slate200),
          ),
          child: Row(
            children: [
              SizedBox(width: 36, child: _RankBadge(rank: entry.rank)),
              const SizedBox(width: 8),
              _Avatar(name: entry.displayName, avatarUrl: entry.avatarUrl),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: mine ? FontWeight.w800 : FontWeight.w600,
                    color: AppColors.slate900,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                formatRupees(entry.totalEarned),
                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: AppColors.navy900),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The first three get a coloured trophy; everyone else just their number.
class _RankBadge extends StatelessWidget {
  const _RankBadge({required this.rank});

  final int rank;

  @override
  Widget build(BuildContext context) {
    final color = switch (rank) {
      1 => AppColors.starRating,
      2 => AppColors.slate400,
      3 => AppColors.orange700,
      _ => null,
    };
    if (color == null) {
      return Text(
        '$rank',
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.slate500),
      );
    }
    return Icon(Icons.emoji_events_rounded, color: color, size: 28);
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.name, required this.avatarUrl});

  final String name;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    final initial = Container(
      width: 36,
      height: 36,
      color: AppColors.orange100,
      alignment: Alignment.center,
      child: Text(
        name.isNotEmpty ? String.fromCharCodes(name.runes.take(1)).toUpperCase() : '?',
        style: const TextStyle(color: AppColors.orange700, fontWeight: FontWeight.w700),
      ),
    );

    final url = avatarUrl;
    return ClipOval(
      child: url == null
          ? initial
          : CachedNetworkImage(
              imageUrl: url,
              width: 36,
              height: 36,
              fit: BoxFit.cover,
              placeholder: (context, _) => initial,
              errorWidget: (context, _, _) => initial,
            ),
    );
  }
}

/// The opt-out. It lives on the same screen as the board so leaving it is one tap, not a search through settings.
class _VisibilityCard extends ConsumerWidget {
  const _VisibilityCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visible = ref.watch(leaderboardProvider).value?.valueOrNull?.me.visible ?? true;
    final saving = ref.watch(leaderboardVisibilityProvider);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Show me on the leaderboard',
                  style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.slate900),
                ),
              ),
              Switch(
                value: visible,
                onChanged: saving.saving
                    ? null
                    : (value) => ref.read(leaderboardVisibilityProvider.notifier).setVisible(value),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: Text(
              'Others see only your first name, the first letter of your last name, and how much you earned. '
              'Turn this off and you are not ranked or shown.',
              style: TextStyle(fontSize: 12.5, color: AppColors.slate500, height: 1.4),
            ),
          ),
          if (saving.error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8, right: 8),
              child: Text(saving.error!, style: const TextStyle(fontSize: 12.5, color: AppColors.danger)),
            ),
        ],
      ),
    );
  }
}
