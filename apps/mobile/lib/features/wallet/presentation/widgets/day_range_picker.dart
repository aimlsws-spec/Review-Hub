import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/transaction_history.dart';

/// Asks the person for two dates. A provider so a test can answer without opening the real calendar.
final dayRangePickerProvider = Provider<Future<DayRange?> Function(BuildContext context, DayRange? current)>((ref) {
  return (context, current) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: today,
      initialDateRange: current == null ? null : DateTimeRange(start: current.start, end: current.end),
      helpText: 'Choose dates',
    );
    return picked == null ? null : DayRange(picked.start, picked.end);
  };
});
