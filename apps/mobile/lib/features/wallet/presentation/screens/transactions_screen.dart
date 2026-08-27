import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../providers/wallet_providers.dart';
import '../widgets/transaction_tile.dart';

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transactionsAsync = ref.watch(walletTransactionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Transactions')),
      body: transactionsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(walletTransactionsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(walletTransactionsProvider)),
          success: (page) {
            if (page.items.isEmpty) {
              return const EmptyState(icon: Icons.receipt_long_outlined, title: 'No transactions yet');
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(walletTransactionsProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: page.items.length,
                itemBuilder: (context, index) => TransactionTile(transaction: page.items[index]),
              ),
            );
          },
        ),
      ),
    );
  }
}
