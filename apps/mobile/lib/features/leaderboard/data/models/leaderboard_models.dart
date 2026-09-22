/// Which board to show. The values are the API's own names
/// (`apps/backend/src/modules/leaderboard/constants/index.ts`).
enum LeaderboardPeriod {
  month('month', 'This month'),
  allTime('all_time', 'All time');

  const LeaderboardPeriod(this.apiValue, this.label);

  final String apiValue;
  final String label;

  /// Falls back to the month board for a value this version of the app does not know.
  static LeaderboardPeriod fromApi(Object? value) {
    for (final period in values) {
      if (period.apiValue == value) return period;
    }
    return LeaderboardPeriod.month;
  }
}

/// One person on the board, as the server sends them: a short display name, never an id.
class LeaderboardEntryModel {
  const LeaderboardEntryModel({
    required this.rank,
    required this.displayName,
    required this.totalEarned,
    required this.isMe,
    this.avatarUrl,
  });

  final int rank;
  final String displayName;
  final String? avatarUrl;
  final double totalEarned;

  /// True for the person using the app, so their row can stand out.
  final bool isMe;

  factory LeaderboardEntryModel.fromJson(Map<String, dynamic> json) {
    final avatar = json['avatarUrl'];
    return LeaderboardEntryModel(
      rank: _asInt(json['rank']),
      displayName: _asText(json['displayName'], fallback: 'Member'),
      avatarUrl: avatar is String && avatar.trim().isNotEmpty ? avatar.trim() : null,
      totalEarned: _asDouble(json['totalEarned']),
      isMe: json['isMe'] == true,
    );
  }
}

/// Where the person using the app stands. [rank] is null when they are hidden or have not earned anything in
/// this period yet.
class LeaderboardStandingModel {
  const LeaderboardStandingModel({required this.visible, required this.totalEarned, this.rank});

  final bool visible;
  final int? rank;
  final double totalEarned;

  factory LeaderboardStandingModel.fromJson(Map<String, dynamic> json) {
    final rank = json['rank'];
    return LeaderboardStandingModel(
      // Visible unless the server says otherwise: hiding is something the person chose, not the default.
      visible: json['visible'] != false,
      rank: rank is num && rank > 0 ? rank.toInt() : null,
      totalEarned: _asDouble(json['totalEarned']),
    );
  }
}

/// Mirrors the response of `GET /leaderboard`.
class LeaderboardModel {
  const LeaderboardModel({required this.period, required this.entries, required this.me, this.resetsAt});

  final LeaderboardPeriod period;

  /// When the month board starts over. Null for the all-time board.
  final DateTime? resetsAt;
  final List<LeaderboardEntryModel> entries;
  final LeaderboardStandingModel me;

  factory LeaderboardModel.fromJson(Map<String, dynamic> json) {
    final rawEntries = json['entries'];
    final rawMe = json['me'];
    final rawReset = json['resetsAt'];
    return LeaderboardModel(
      period: LeaderboardPeriod.fromApi(json['period']),
      resetsAt: rawReset is String ? DateTime.tryParse(rawReset)?.toLocal() : null,
      entries: rawEntries is List
          ? [
              for (final item in rawEntries)
                if (item is Map<String, dynamic>) LeaderboardEntryModel.fromJson(item),
            ]
          : const [],
      me: rawMe is Map<String, dynamic>
          ? LeaderboardStandingModel.fromJson(rawMe)
          : const LeaderboardStandingModel(visible: true, totalEarned: 0),
    );
  }
}

int _asInt(Object? value) => value is num ? value.toInt() : 0;

/// The API sends money as numbers, but a decimal column can also arrive as a string, so both are accepted.
double _asDouble(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

String _asText(Object? value, {required String fallback}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  return fallback;
}
