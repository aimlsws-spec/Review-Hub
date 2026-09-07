import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/marketplace_item_model.dart';
import '../../providers/marketplace_providers.dart';

class MarketplaceScreen extends ConsumerWidget {
  const MarketplaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(marketplaceItemsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        title: const Text('Marketplace'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long_rounded),
            tooltip: 'My redemptions',
            onPressed: () => context.push(RoutePaths.marketplaceRedemptions),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.read(marketplaceRefreshProvider.notifier).state++,
        child: itemsAsync.when(
          loading: () => const PageLoader(),
          error: (error, stack) => Center(child: Text('$error')),
          data: (result) => result.when(
            success: (page) {
              if (page.items.isEmpty) {
                return const EmptyState(
                  icon: Icons.storefront_outlined,
                  title: 'Nothing to redeem yet',
                  description: 'Check back soon for redeemable rewards.',
                );
              }
              return GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.78,
                ),
                itemCount: page.items.length,
                itemBuilder: (context, index) => _ItemCard(item: page.items[index]),
              );
            },
            failure: (failure) => Center(child: Text(failure.message, style: const TextStyle(color: AppColors.danger))),
          ),
        ),
      ),
    );
  }
}

class _ItemCard extends ConsumerStatefulWidget {
  const _ItemCard({required this.item});

  final MarketplaceItemModel item;

  @override
  ConsumerState<_ItemCard> createState() => _ItemCardState();
}

class _ItemCardState extends ConsumerState<_ItemCard> {
  bool _redeeming = false;

  Future<void> _confirmAndRedeem() async {
    final item = widget.item;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Redeem this item?'),
        content: Text('Redeem "${item.title}" for ₹${item.costAmountValue.toStringAsFixed(0)} from your wallet balance?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Redeem')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _redeeming = true);
    final result = await ref.read(marketplaceRepositoryProvider).redeem(item.id);
    if (!mounted) return;
    setState(() => _redeeming = false);

    result.when(
      success: (redemption) {
        ref.read(marketplaceRefreshProvider.notifier).state++;
        showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Redeemed!'),
            content: Text('Your redemption code is:\n\n${redemption.redemptionCode}'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done')),
            ],
          ),
        );
      },
      failure: (failure) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failure.message)));
      },
    );
  }

  Widget _fallbackIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: const BoxDecoration(color: AppColors.primary50, shape: BoxShape.circle),
      child: const Icon(Icons.redeem_rounded, color: AppColors.primary600, size: 20),
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final disabled = item.isOutOfStock || _redeeming;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: item.thumbnailUrl != null
                ? CachedNetworkImage(
                    imageUrl: item.thumbnailUrl!,
                    width: 40,
                    height: 40,
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) => _fallbackIcon(),
                  )
                : _fallbackIcon(),
          ),
          const SizedBox(height: 10),
          Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(
            item.isOutOfStock ? 'Out of stock' : '₹${item.costAmountValue.toStringAsFixed(0)}',
            style: TextStyle(fontSize: 12, color: item.isOutOfStock ? AppColors.danger : AppColors.slate500),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: disabled ? null : _confirmAndRedeem,
              child: _redeeming
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Redeem', style: TextStyle(fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
