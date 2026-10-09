import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/campaign_progress_model.dart';
import '../../providers/campaign_providers.dart';

/// The campaigns the person has joined: the ones still under way, and the ones they have completed, with what each
/// earned them. Opens on "Completed" when asked to, e.g. from the "you have completed this campaign" banner.
class MyCampaignsScreen extends StatelessWidget {
  const MyCampaignsScreen({super.key, this.initialFilter = JoinedCampaignFilter.inProgress});

  final JoinedCampaignFilter initialFilter;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: JoinedCampaignFilter.values.length,
      initialIndex: JoinedCampaignFilter.values.indexOf(initialFilter),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My campaigns'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'In progress'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _JoinedList(filter: JoinedCampaignFilter.inProgress),
            _JoinedList(filter: JoinedCampaignFilter.completed),
          ],
        ),
      ),
    );
  }
}

class _JoinedList extends ConsumerWidget {
  const _JoinedList({required this.filter});

  final JoinedCampaignFilter filter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(joinedCampaignsProvider(filter));

    return async.when(
      loading: () => const PageLoader(),
      error: (error, stack) =>
          ErrorStateView(message: '$error', onRetry: () => ref.invalidate(joinedCampaignsProvider(filter))),
      data: (result) => result.when(
        failure: (failure) =>
            ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(joinedCampaignsProvider(filter))),
        success: (page) {
          if (page.items.isEmpty) {
            return filter == JoinedCampaignFilter.completed
                ? const EmptyState(
                    icon: Icons.emoji_events_outlined,
                    title: 'No completed campaigns yet',
                    description: 'Campaigns where you have finished every task show up here.',
                  )
                : const EmptyState(
                    icon: Icons.campaign_outlined,
                    title: 'Nothing in progress',
                    description: 'Start a task in any campaign and it shows up here.',
                  );
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(joinedCampaignsProvider(filter).future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: page.items.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final campaign = page.items[index];
                return _JoinedCampaignCard(
                  campaign: campaign,
                  onTap: () => context.push(RoutePaths.campaignDetailPath(campaign.campaignId)),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _JoinedCampaignCard extends StatelessWidget {
  const _JoinedCampaignCard({required this.campaign, required this.onTap});

  final JoinedCampaignModel campaign;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final completed = campaign.completedAt;
    final details = [
      if (campaign.tasksTotal > 0) '${campaign.tasksCompleted} of ${campaign.tasksTotal} tasks done',
      if (completed != null) 'Completed ${DateFormat('d MMM yyyy').format(completed.toLocal())}',
    ].join(' · ');

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: campaign.thumbnailImageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: campaign.thumbnailImageUrl!,
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => const _Placeholder(),
                      )
                    : const _Placeholder(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      campaign.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.slate900),
                    ),
                    if (campaign.businessName.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(campaign.businessName, style: const TextStyle(fontSize: 12.5, color: AppColors.slate500)),
                    ],
                    if (details.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(details, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${campaign.earned.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.success),
                  ),
                  const Text('earned', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      color: AppColors.primary50,
      child: const Icon(Icons.campaign_outlined, color: AppColors.primary400),
    );
  }
}
