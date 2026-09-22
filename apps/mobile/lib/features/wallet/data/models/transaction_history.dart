import 'dart:typed_data';

/// The kinds of wallet movement a person can narrow their history to. The values are the API's own
/// `WalletTransactionType` names; the server has a few more (holds and releases) that are only ever shown under
/// "All".
enum TransactionKind {
  earnings('CREDIT', 'Earnings'),
  bonus('BONUS', 'Bonus'),
  referral('REFERRAL', 'Referral'),
  withdrawals('WITHDRAWAL', 'Withdrawals'),
  spent('SPEND', 'Spent'),
  refunds('REFUND', 'Refunds');

  const TransactionKind(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// A stretch of days. Both ends are whole days on the phone's calendar and are included.
class DayRange {
  const DayRange(this.start, this.end);

  final DateTime start;
  final DateTime end;

  @override
  bool operator ==(Object other) => other is DayRange && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(start, end);
}

/// The period presets, and a custom range.
enum TransactionPeriod {
  allTime('All time'),
  last7Days('Last 7 days'),
  last30Days('Last 30 days'),
  thisMonth('This month'),
  custom('Choose dates');

  const TransactionPeriod(this.label);

  final String label;
}

/// The longest stretch the server will filter or download. Kept in step with `TRANSACTION_MAX_RANGE_DAYS` in
/// `apps/backend/src/modules/wallet/transaction-filter.ts`.
const int maxTransactionRangeDays = 366;

/// What a person has asked the history to show.
class TransactionHistoryFilter {
  const TransactionHistoryFilter({
    this.kind,
    this.period = TransactionPeriod.allTime,
    this.customRange,
    this.search = '',
  });

  /// Null shows every kind.
  final TransactionKind? kind;
  final TransactionPeriod period;

  /// Only used when [period] is [TransactionPeriod.custom].
  final DayRange? customRange;
  final String search;

  /// Whether anything narrows the list, so the screen can offer to clear it.
  bool get isNarrowed => kind != null || period != TransactionPeriod.allTime || search.isNotEmpty;

  /// The two dates the server is asked for, written the way it reads them ("2026-09-21"), or null for no limit.
  /// The presets are counted back from [today], including today.
  ({String? from, String? to}) dates(DateTime today) {
    final day = DateTime(today.year, today.month, today.day);
    return switch (period) {
      TransactionPeriod.allTime => (from: null, to: null),
      TransactionPeriod.last7Days => (from: apiDate(day.subtract(const Duration(days: 6))), to: apiDate(day)),
      TransactionPeriod.last30Days => (from: apiDate(day.subtract(const Duration(days: 29))), to: apiDate(day)),
      TransactionPeriod.thisMonth => (from: apiDate(DateTime(day.year, day.month, 1)), to: apiDate(day)),
      TransactionPeriod.custom =>
        customRange == null
            ? (from: null, to: null)
            : (from: apiDate(customRange!.start), to: apiDate(customRange!.end)),
    };
  }

  TransactionHistoryFilter copyWith({
    TransactionKind? kind,
    bool clearKind = false,
    TransactionPeriod? period,
    DayRange? customRange,
    String? search,
  }) {
    return TransactionHistoryFilter(
      kind: clearKind ? null : (kind ?? this.kind),
      period: period ?? this.period,
      customRange: customRange ?? this.customRange,
      search: search ?? this.search,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is TransactionHistoryFilter &&
      other.kind == kind &&
      other.period == period &&
      other.customRange == customRange &&
      other.search == search;

  @override
  int get hashCode => Object.hash(kind, period, customRange, search);
}

/// A date as the server reads it: "2026-09-21", by the phone's own calendar.
String apiDate(DateTime date) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${date.year.toString().padLeft(4, '0')}-${two(date.month)}-${two(date.day)}';
}

/// A statement the server built, ready to hand to another app.
class TransactionExport {
  const TransactionExport({required this.bytes, required this.filename, required this.truncated});

  final Uint8List bytes;
  final String filename;

  /// The history was longer than one file holds, so this is the newest part of it.
  final bool truncated;
}
