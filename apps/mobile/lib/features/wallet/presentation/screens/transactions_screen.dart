import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/transaction_history.dart';
import '../../providers/wallet_providers.dart';
import '../widgets/day_range_picker.dart';
import '../widgets/transaction_tile.dart';

/// The whole wallet history: search it, narrow it by kind and by dates, page through all of it, and download it as a
/// spreadsheet.
class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final exporting = ref.watch(statementExportProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            tooltip: 'Download statement',
            onPressed: exporting ? null : () => _download(context, ref),
            icon: exporting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.file_download_outlined),
          ),
        ],
      ),
      body: const Column(
        children: [
          _SearchAndFilters(),
          Expanded(child: _HistoryList()),
        ],
      ),
    );
  }

  Future<void> _download(BuildContext context, WidgetRef ref) async {
    final outcome = await ref.read(statementExportProvider.notifier).download();
    if (!context.mounted) return;

    final message =
        outcome.error ??
        (outcome.truncated ? 'That is the newest 5,000 transactions. Choose fewer dates to get the rest.' : null);
    if (message == null) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

class _SearchAndFilters extends ConsumerWidget {
  const _SearchAndFilters();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(transactionHistoryFilterProvider);
    final notifier = ref.read(transactionHistoryFilterProvider.notifier);
    final controller = ref.watch(transactionSearchControllerProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (context, value, _) => TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              maxLength: 50,
              buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
              decoration: InputDecoration(
                hintText: 'Search notes',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: value.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded),
                        tooltip: 'Clear search',
                        onPressed: () {
                          controller.clear();
                          notifier.setSearch('');
                        },
                      ),
              ),
              onSubmitted: notifier.setSearch,
            ),
          ),
        ),
        _ChipRow(
          label: 'Kind',
          chips: [
            ChoiceChip(
              label: const Text('All'),
              selected: filter.kind == null,
              onSelected: (_) => notifier.setKind(null),
            ),
            for (final kind in TransactionKind.values)
              ChoiceChip(
                label: Text(kind.label),
                selected: filter.kind == kind,
                onSelected: (_) => notifier.setKind(kind),
              ),
          ],
        ),
        _ChipRow(
          label: 'Dates',
          chips: [
            for (final period in TransactionPeriod.values)
              ChoiceChip(
                label: Text(
                  period == TransactionPeriod.custom && filter.customRange != null
                      ? _rangeLabel(filter.customRange!)
                      : period.label,
                ),
                selected: filter.period == period,
                onSelected: (_) => period == TransactionPeriod.custom
                    ? _chooseDates(context, ref, filter)
                    : notifier.setPeriod(period),
              ),
          ],
        ),
        const SizedBox(height: 4),
      ],
    );
  }

  Future<void> _chooseDates(BuildContext context, WidgetRef ref, TransactionHistoryFilter filter) async {
    final range = await ref.read(dayRangePickerProvider)(context, filter.customRange);
    if (range == null || !context.mounted) return;

    // The same limit the server has, so the person is told here instead of getting an error back.
    if (range.end.difference(range.start).inDays >= maxTransactionRangeDays) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Choose a period of up to a year.')));
      return;
    }
    ref.read(transactionHistoryFilterProvider.notifier).setCustomRange(range);
  }

  static String _rangeLabel(DayRange range) => '${apiDate(range.start)} to ${apiDate(range.end)}';
}

/// A scrolling row of chips. The label is for screen readers.
class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.label, required this.chips});

  final String label;
  final List<Widget> chips;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: label,
      child: SizedBox(
        height: 46,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [for (final chip in chips) Padding(padding: const EdgeInsets.only(right: 8), child: chip)],
          ),
        ),
      ),
    );
  }
}

class _HistoryList extends ConsumerWidget {
  const _HistoryList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(transactionHistoryProvider);
    final narrowed = ref.watch(transactionHistoryFilterProvider.select((filter) => filter.isNarrowed));

    return historyAsync.when(
      loading: () => const PageLoader(),
      error: (error, stack) =>
          ErrorStateView(message: '$error', onRetry: () => ref.invalidate(transactionHistoryProvider)),
      data: (result) => result.when(
        failure: (failure) =>
            ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(transactionHistoryProvider)),
        success: (history) {
          if (history.items.isEmpty) {
            return narrowed
                ? EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'No transactions match',
                    description: 'Try different words, kind or dates.',
                    action: OutlinedButton(
                      onPressed: () {
                        ref.read(transactionSearchControllerProvider).clear();
                        ref.read(transactionHistoryFilterProvider.notifier).clear();
                      },
                      child: const Text('Clear filters'),
                    ),
                  )
                : const EmptyState(icon: Icons.receipt_long_outlined, title: 'No transactions yet');
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(transactionHistoryProvider),
            child: NotificationListener<ScrollNotification>(
              onNotification: (notification) {
                // Near the bottom: bring the next page in before the person gets there.
                if (notification.metrics.extentAfter < 300) ref.read(transactionHistoryProvider.notifier).loadMore();
                return false;
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: history.items.length + 1,
                itemBuilder: (context, index) {
                  if (index < history.items.length) return TransactionTile(transaction: history.items[index]);
                  return _Footer(history: history);
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

/// The end of the list: a spinner while the next page comes, a way to ask for it, or nothing more to load.
class _Footer extends ConsumerWidget {
  const _Footer({required this.history});

  final TransactionListState history;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (history.loadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    if (!history.hasMore) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: Text(
            '${history.total} ${history.total == 1 ? 'transaction' : 'transactions'}',
            style: const TextStyle(color: Colors.black45, fontSize: 12.5),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          if (history.loadMoreMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(history.loadMoreMessage!, style: const TextStyle(color: Colors.red, fontSize: 12.5)),
            ),
          TextButton(
            onPressed: () => ref.read(transactionHistoryProvider.notifier).loadMore(),
            child: const Text('Load more'),
          ),
        ],
      ),
    );
  }
}
