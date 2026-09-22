import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/leaderboard/data/leaderboard_repository.dart';
import 'package:viral_kar/features/leaderboard/data/models/leaderboard_models.dart';
import 'package:viral_kar/features/leaderboard/presentation/screens/leaderboard_screen.dart';
import 'package:viral_kar/features/leaderboard/presentation/widgets/leaderboard_format.dart';
import 'package:viral_kar/features/leaderboard/providers/leaderboard_providers.dart';

/// Stands in for the network: serves the board the test sets, per period, and records what it was asked.
class _FakeLeaderboardRepository extends Fake implements LeaderboardRepository {
  final Map<LeaderboardPeriod, Result<LeaderboardModel>> boards = {};
  final List<LeaderboardPeriod> loaded = [];
  final List<bool> visibilityRequests = [];
  Result<bool>? visibilityResult;

  @override
  Future<Result<LeaderboardModel>> load(LeaderboardPeriod period, {int limit = 20}) async {
    loaded.add(period);
    return boards[period] ??
        Result.success(
          LeaderboardModel(
            period: period,
            entries: const [],
            me: const LeaderboardStandingModel(visible: true, totalEarned: 0),
          ),
        );
  }

  @override
  Future<Result<bool>> setVisibility({required bool visible}) async {
    visibilityRequests.add(visible);
    final result = visibilityResult ?? Result.success(visible);
    // The server now says what it says, so the reload that follows shows it.
    if (result.isSuccess) {
      for (final period in LeaderboardPeriod.values) {
        final board = boards[period]?.valueOrNull;
        if (board != null) {
          boards[period] = Result.success(
            LeaderboardModel(
              period: board.period,
              resetsAt: board.resetsAt,
              entries: board.entries,
              me: LeaderboardStandingModel(
                visible: visible,
                rank: visible ? board.me.rank : null,
                totalEarned: board.me.totalEarned,
              ),
            ),
          );
        }
      }
    }
    return result;
  }
}

LeaderboardEntryModel _entry(int rank, String name, double total, {bool isMe = false}) =>
    LeaderboardEntryModel(rank: rank, displayName: name, totalEarned: total, isMe: isMe);

LeaderboardModel _board({
  LeaderboardPeriod period = LeaderboardPeriod.month,
  List<LeaderboardEntryModel> entries = const [],
  LeaderboardStandingModel me = const LeaderboardStandingModel(visible: true, totalEarned: 0),
  DateTime? resetsAt,
}) => LeaderboardModel(period: period, entries: entries, me: me, resetsAt: resetsAt);

void main() {
  group('LeaderboardModel.fromJson', () {
    test('reads the board the server sends', () {
      final board = LeaderboardModel.fromJson({
        'period': 'month',
        'resetsAt': '2026-09-30T18:30:00.000Z',
        'entries': [
          {'rank': 1, 'displayName': 'Asha P.', 'avatarUrl': null, 'totalEarned': 900.5, 'isMe': false},
          {
            'rank': 2,
            'displayName': 'Ravi K.',
            'avatarUrl': ' https://cdn.test/a.png ',
            'totalEarned': 400,
            'isMe': true,
          },
        ],
        'me': {'visible': true, 'rank': 2, 'totalEarned': 400},
      });

      expect(board.period, LeaderboardPeriod.month);
      expect(board.resetsAt, isNotNull);
      expect(board.entries.map((e) => e.displayName), ['Asha P.', 'Ravi K.']);
      expect(board.entries[0].totalEarned, 900.5);
      expect(board.entries[0].avatarUrl, isNull);
      expect(board.entries[1].avatarUrl, 'https://cdn.test/a.png');
      expect(board.entries[1].isMe, isTrue);
      expect(board.me.rank, 2);
    });

    test('survives missing, malformed and blank data instead of crashing the screen', () {
      final board = LeaderboardModel.fromJson({
        'period': 'someday',
        'resetsAt': 'not a date',
        'entries': [
          'junk',
          {'rank': 'first', 'displayName': '  ', 'totalEarned': '12.5'},
          42,
        ],
        'me': 'nobody',
      });

      expect(board.period, LeaderboardPeriod.month);
      expect(board.resetsAt, isNull);
      expect(board.entries, hasLength(1));
      expect(board.entries.single.rank, 0);
      expect(board.entries.single.displayName, 'Member');
      expect(board.entries.single.totalEarned, 12.5);
      expect(board.me.visible, isTrue);
      expect(board.me.rank, isNull);
      expect(LeaderboardModel.fromJson({}).entries, isEmpty);
    });

    test('takes a hidden person as hidden and an impossible rank as no rank', () {
      final hidden = LeaderboardStandingModel.fromJson({'visible': false, 'rank': null, 'totalEarned': 0});
      final odd = LeaderboardStandingModel.fromJson({'visible': true, 'rank': 0, 'totalEarned': 5});

      expect(hidden.visible, isFalse);
      expect(hidden.rank, isNull);
      expect(odd.rank, isNull);
    });

    test('knows the periods by the API names, and falls back to the month for a new one', () {
      expect(LeaderboardPeriod.fromApi('all_time'), LeaderboardPeriod.allTime);
      expect(LeaderboardPeriod.fromApi('month'), LeaderboardPeriod.month);
      expect(LeaderboardPeriod.fromApi('quarter'), LeaderboardPeriod.month);
      expect(LeaderboardPeriod.fromApi(null), LeaderboardPeriod.month);
    });
  });

  group('formatRupees', () {
    test('groups the way people here write it, and drops paise that are not there', () {
      expect(formatRupees(123456), '₹1,23,456');
      expect(formatRupees(900), '₹900');
      expect(formatRupees(0), '₹0');
    });

    test('keeps paise when there are some', () {
      expect(formatRupees(1234.5), '₹1,234.50');
    });
  });

  group('LeaderboardScreen', () {
    late _FakeLeaderboardRepository repository;

    setUp(() => repository = _FakeLeaderboardRepository());

    Future<void> open(WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 3600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [leaderboardRepositoryProvider.overrideWithValue(repository)],
          child: const MaterialApp(home: LeaderboardScreen()),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('lists people by rank with what they earned, and marks the person using the app', (tester) async {
      repository.boards[LeaderboardPeriod.month] = Result.success(
        _board(
          entries: [_entry(1, 'Asha P.', 123456), _entry(2, 'Ravi K.', 900, isMe: true), _entry(3, 'Meera S.', 250.5)],
          me: const LeaderboardStandingModel(visible: true, rank: 2, totalEarned: 900),
        ),
      );

      await open(tester);

      expect(find.text('Asha P.'), findsOneWidget);
      expect(find.text('₹1,23,456'), findsWidgets);
      expect(find.text('Ravi K. (you)'), findsOneWidget);
      expect(find.text('₹250.50'), findsOneWidget);
      expect(find.text('You are #2'), findsOneWidget);
      expect(find.text('₹900 earned this month'), findsOneWidget);
    });

    testWidgets('says when the month starts over', (tester) async {
      repository.boards[LeaderboardPeriod.month] = Result.success(_board(resetsAt: DateTime(2026, 10, 1)));

      await open(tester);

      expect(find.text('Starts over on 1 Oct'), findsOneWidget);
    });

    testWidgets('tells a person with no rank yet what to do, without inventing one', (tester) async {
      await open(tester);

      expect(find.text('Not on the board yet'), findsOneWidget);
      expect(find.textContaining('Finish a task'), findsWidgets);
      expect(find.text('Nobody is on the board yet'), findsOneWidget);
      expect(find.textContaining('You are #'), findsNothing);
    });

    testWidgets('tells a hidden person they are hidden, and shows the switch off', (tester) async {
      repository.boards[LeaderboardPeriod.month] = Result.success(
        _board(
          entries: [_entry(1, 'Asha P.', 500)],
          me: const LeaderboardStandingModel(visible: false, totalEarned: 0),
        ),
      );

      await open(tester);

      expect(find.text('You are hidden'), findsOneWidget);
      expect(tester.widget<Switch>(find.byType(Switch)).value, isFalse);
    });

    testWidgets('loads the other board when the period changes', (tester) async {
      repository.boards[LeaderboardPeriod.allTime] = Result.success(
        _board(
          period: LeaderboardPeriod.allTime,
          entries: [_entry(1, 'Old Timer T.', 99999)],
          me: const LeaderboardStandingModel(visible: true, rank: 1, totalEarned: 99999),
        ),
      );
      await open(tester);
      expect(repository.loaded, [LeaderboardPeriod.month]);

      await tester.tap(find.text('All time'));
      await tester.pumpAndSettle();

      expect(repository.loaded, [LeaderboardPeriod.month, LeaderboardPeriod.allTime]);
      expect(find.text('Old Timer T.'), findsOneWidget);
      expect(find.text('₹99,999 earned in total'), findsOneWidget);
      expect(find.textContaining('Starts over'), findsNothing);
    });

    testWidgets('turning the switch off keeps the person off the board, then reloads it', (tester) async {
      repository.boards[LeaderboardPeriod.month] = Result.success(
        _board(
          entries: [_entry(1, 'Ravi K.', 900, isMe: true)],
          me: const LeaderboardStandingModel(visible: true, rank: 1, totalEarned: 900),
        ),
      );
      await open(tester);

      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();

      expect(repository.visibilityRequests, [false]);
      expect(repository.loaded, hasLength(2));
      expect(find.text('You are hidden'), findsOneWidget);
      expect(tester.widget<Switch>(find.byType(Switch)).value, isFalse);
    });

    testWidgets('shows why it could not be saved, and leaves the switch as it was', (tester) async {
      repository.boards[LeaderboardPeriod.month] = Result.success(
        _board(
          entries: [_entry(1, 'Ravi K.', 900, isMe: true)],
          me: const LeaderboardStandingModel(visible: true, rank: 1, totalEarned: 900),
        ),
      );
      repository.visibilityResult = const Result.failure(NetworkFailure('No internet connection.'));
      await open(tester);

      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();

      expect(find.text('No internet connection.'), findsOneWidget);
      expect(tester.widget<Switch>(find.byType(Switch)).value, isTrue);
      expect(find.text('You are #1'), findsOneWidget);
    });

    testWidgets('offers to try again when the board could not be loaded', (tester) async {
      repository.boards[LeaderboardPeriod.month] = const Result.failure(NetworkFailure('No internet connection.'));

      await open(tester);

      expect(find.text('No internet connection.'), findsOneWidget);
      repository.boards[LeaderboardPeriod.month] = Result.success(_board(entries: [_entry(1, 'Asha P.', 10)]));
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(find.text('Asha P.'), findsOneWidget);
    });

    testWidgets('explains what others can see about you, and what counts', (tester) async {
      await open(tester);

      expect(find.textContaining('first name, the first letter of your last name'), findsOneWidget);
      expect(find.textContaining('taken back for breaking the rules'), findsOneWidget);
    });
  });
}
