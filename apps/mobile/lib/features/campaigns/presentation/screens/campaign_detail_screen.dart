import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/campaign_model.dart';
import '../../data/models/campaign_task_model.dart';
import '../../providers/campaign_providers.dart';

class CampaignDetailScreen extends ConsumerWidget {
  const CampaignDetailScreen({super.key, required this.campaignId});

  final String campaignId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaignsAsync = ref.watch(campaignsProvider);
    final tasksAsync = ref.watch(campaignTasksProvider(campaignId));

    // The campaign itself was already fetched by the browse list; find it
    // there rather than adding a second "get one campaign" endpoint call.
    final campaignMatches = campaignsAsync.value?.valueOrNull?.items.where((c) => c.id == campaignId);
    final campaign = (campaignMatches != null && campaignMatches.isNotEmpty) ? campaignMatches.first : null;

    return Scaffold(
      appBar: AppBar(title: Text(campaign?.title ?? 'Campaign')),
      body: CustomScrollView(
        slivers: [
          if (campaign != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (campaign.bannerUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: CachedNetworkImage(
                          imageUrl: campaign.bannerUrl!,
                          height: 160,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    const SizedBox(height: 12),
                    Text(campaign.title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text(campaign.description, style: const TextStyle(fontSize: 14, color: Color.fromARGB(255, 226, 139, 81), height: 1.5)),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        AppBadge(label: '₹${campaign.rewardAmountValue.toStringAsFixed(0)} per task', variant: BadgeVariant.green),
                        AppBadge(
                          label: '${campaign.currentParticipants}${campaign.maxParticipants != null ? '/${campaign.maxParticipants}' : ''} joined',
                          variant: BadgeVariant.blue,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Text('Tasks', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ),
          tasksAsync.when(
            loading: () => const SliverToBoxAdapter(child: PageLoader()),
            error: (error, stack) => SliverToBoxAdapter(child: ErrorStateView(message: '$error')),
            data: (result) => result.when(
              success: (tasks) {
                if (tasks.isEmpty) {
                  return const SliverToBoxAdapter(
                    child: EmptyState(title: 'No tasks yet', icon: Icons.checklist_rounded),
                  );
                }
                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _TaskTile(
                      task: tasks[index],
                      onTap: () => context.push(RoutePaths.taskDetailPath(campaignId, tasks[index].id)),
                    ),
                    childCount: tasks.length,
                  ),
                );
              },
              failure: (failure) => SliverToBoxAdapter(child: ErrorStateView(message: failure.message)),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task, required this.onTap});

  final CampaignTaskModel task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        child: ListTile(
          onTap: onTap,
          leading: Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(color: AppColors.primary50, shape: BoxShape.circle),
            child: const Icon(Icons.task_alt_rounded, color: AppColors.primary600, size: 20),
          ),
          title: Text(task.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: task.rewardAmountValue != null
              ? Text('₹${task.rewardAmountValue!.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12.5, color: AppColors.success))
              : null,
          trailing: const Icon(Icons.chevron_right, color: AppColors.slate300),
        ),
      ),
    );
  }
}
