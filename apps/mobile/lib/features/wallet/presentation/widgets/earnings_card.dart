import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/earnings_model.dart';
import '../../providers/wallet_providers.dart';

/// Which chart the wallet screen shows. Page-scoped: it starts on the week each time the screen opens.
final earningsPeriodProvider = StateProvider.autoDispose<EarningsPeriod>((ref) => EarningsPeriod.week);

const _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// Short label under a bar: the day of the month for "2026-09-21", the month name for "2026-09".
String earningsAxisLabel(String key) {
  final parts = key.split('-');
  if (parts.length == 3) return '${int.tryParse(parts[2]) ?? parts[2]}';
  final month = parts.length == 2 ? int.tryParse(parts[1]) : null;
  return month != null && month >= 1 && month <= 12 ? _monthNames[month - 1] : key;
}

/// Where the person's money came from, and how much they earned per day or month.
class EarningsCard extends StatelessWidget {
  const EarningsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16)),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Earnings',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900),
          ),
          SizedBox(height: 12),
          _Breakdown(),
          SizedBox(height: 20),
          _PeriodToggle(),
          SizedBox(height: 12),
          _Chart(),
        ],
      ),
    );
  }
}

class _Breakdown extends ConsumerWidget {
  const _Breakdown();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(earningsBreakdownProvider);
    return async.when(
      loading: () => const SizedBox(height: 48, child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
      error: (error, _) => const Text('Earnings could not be loaded.', style: TextStyle(color: AppColors.danger)),
      data: (result) => result.when(
        failure: (failure) => Text(failure.message, style: const TextStyle(color: AppColors.danger)),
        success: (earnings) => Row(
          children: [
            _Figure(label: 'Tasks', amount: earnings.tasks),
            _Figure(label: 'Bonus', amount: earnings.bonus),
            _Figure(label: 'Referral', amount: earnings.referral),
          ],
        ),
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({required this.label, required this.amount});

  final String label;
  final double amount;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
          const SizedBox(height: 2),
          Text(
            '₹${amount.toStringAsFixed(0)}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.navy900),
          ),
        ],
      ),
    );
  }
}

class _PeriodToggle extends ConsumerWidget {
  const _PeriodToggle();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(earningsPeriodProvider);
    return SegmentedButton<EarningsPeriod>(
      segments: const [
        ButtonSegment(value: EarningsPeriod.week, label: Text('Last 7 days')),
        ButtonSegment(value: EarningsPeriod.month, label: Text('Last 6 months')),
      ],
      selected: {period},
      showSelectedIcon: false,
      onSelectionChanged: (selection) => ref.read(earningsPeriodProvider.notifier).state = selection.first,
    );
  }
}

class _Chart extends ConsumerWidget {
  const _Chart();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(earningsPeriodProvider);
    final async = ref.watch(earningsChartProvider(period));
    return SizedBox(
      height: 160,
      child: async.when(
        loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        error: (error, _) => const _ChartMessage('The chart could not be loaded. Pull down to try again.'),
        data: (result) => result.when(
          failure: (failure) => _ChartMessage(failure.message),
          success: (chart) => chart.points.every((point) => point.amount == 0)
              ? _ChartMessage(
                  period == EarningsPeriod.week
                      ? 'No earnings in the last 7 days yet.'
                      : 'No earnings in the last 6 months yet.',
                )
              : _Bars(points: chart.points),
        ),
      ),
    );
  }
}

class _ChartMessage extends StatelessWidget {
  const _ChartMessage(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(color: AppColors.slate500),
      ),
    );
  }
}

class _Bars extends StatelessWidget {
  const _Bars({required this.points});

  final List<EarningsPointModel> points;

  @override
  Widget build(BuildContext context) {
    return BarChart(
      BarChartData(
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
              '₹${rod.toY.toStringAsFixed(0)}',
              const TextStyle(color: AppColors.white, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(),
          rightTitles: const AxisTitles(),
          topTitles: const AxisTitles(),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 || index >= points.length) return const SizedBox.shrink();
                return SideTitleWidget(
                  meta: meta,
                  child: Text(
                    earningsAxisLabel(points[index].key),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < points.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                // A day can come out negative when a clawback lands on it; the bar then shows nothing below zero.
                BarChartRodData(
                  toY: points[i].amount < 0 ? 0 : points[i].amount,
                  color: AppColors.orange500,
                  width: 14,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
