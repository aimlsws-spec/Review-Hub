import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/redemption_model.dart';
import '../../providers/marketplace_providers.dart';

class MyRedemptionsScreen extends ConsumerWidget {
  const MyRedemptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final redemptionsAsync = ref.watch(myRedemptionsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: const Text('My Redemptions')),
      body: redemptionsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => Center(child: Text('$error')),
        data: (result) => result.when(
          success: (page) {
            if (page.items.isEmpty) {
              return const EmptyState(
                icon: Icons.receipt_long_outlined,
                title: 'No redemptions yet',
                description: 'Items you redeem from the marketplace show up here.',
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: page.items.length,
              itemBuilder: (context, index) => _RedemptionTile(redemption: page.items[index]),
            );
          },
          failure: (failure) => Center(child: Text(failure.message, style: const TextStyle(color: AppColors.danger))),
        ),
      ),
    );
  }
}

class _RedemptionTile extends StatelessWidget {
  const _RedemptionTile({required this.redemption});

  final RedemptionModel redemption;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: AppColors.primary100,
          child: Icon(Icons.redeem_rounded, color: AppColors.primary700, size: 18),
        ),
        title: Text(redemption.redemptionCode, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
        subtitle: Text(DateFormat('d MMM yyyy, h:mm a').format(redemption.createdAt), style: const TextStyle(fontSize: 12)),
        trailing: Text('₹${redemption.costAmountValue.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}
