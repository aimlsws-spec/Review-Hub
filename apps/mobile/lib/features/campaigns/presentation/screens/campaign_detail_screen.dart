import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/failure.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../data/models/campaign_browse.dart';
import '../../data/models/campaign_model.dart';
import '../../data/models/campaign_task_model.dart';
import '../../providers/campaign_providers.dart';

class CampaignDetailScreen extends ConsumerWidget {
  const CampaignDetailScreen({super.key, required this.campaignId});

  final String campaignId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // The campaign is fetched by its own id, so it shows wherever the person came from, not only when it happens to
    // be on the first page of some list.
    final campaignAsync = ref.watch(campaignProvider(campaignId));
    final tasksAsync = ref.watch(campaignTasksProvider(campaignId));
    final campaign = campaignAsync.value?.valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Text(campaign?.title ?? 'Campaign'),
        actions: [
          if (campaign != null) ...[_SaveButton(campaignId: campaignId), _ShareButton(campaign: campaign)],
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: campaignAsync.when(
              loading: () => const SizedBox(height: 160, child: PageLoader()),
              error: (error, stack) =>
                  ErrorStateView(message: '$error', onRetry: () => ref.invalidate(campaignProvider(campaignId))),
              data: (result) => result.when(
                success: (campaign) => _Header(campaign: campaign),
                failure: (failure) => failure is NotFoundFailure
                    ? const EmptyState(
                        icon: Icons.event_busy_rounded,
                        title: 'This campaign is no longer available',
                        description: 'It may have ended. Have a look at the other campaigns.',
                      )
                    : ErrorStateView(
                        message: failure.message,
                        onRetry: () => ref.invalidate(campaignProvider(campaignId)),
                      ),
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

class _Header extends StatelessWidget {
  const _Header({required this.campaign});

  final CampaignModel campaign;

  @override
  Widget build(BuildContext context) {
    return Padding(
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
          Text(
            campaign.description,
            style: const TextStyle(fontSize: 14, color: Color.fromARGB(255, 226, 139, 81), height: 1.5),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AppBadge(
                label: '₹${campaign.rewardAmountValue.toStringAsFixed(0)} per task',
                variant: BadgeVariant.green,
              ),
              AppBadge(
                label:
                    '${campaign.currentParticipants}${campaign.maxParticipants != null ? '/${campaign.maxParticipants}' : ''} joined',
                variant: BadgeVariant.blue,
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text('Tasks', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

/// The bookmark: saves the campaign on this phone, or takes it off the saved list.
class _SaveButton extends ConsumerWidget {
  const _SaveButton({required this.campaignId});

  final String campaignId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedCampaignIdsProvider.select((ids) => ids.contains(campaignId)));

    return IconButton(
      icon: Icon(saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
      tooltip: saved ? 'Remove from saved' : 'Save for later',
      onPressed: () async {
        final outcome = await ref.read(savedCampaignIdsProvider.notifier).toggle(campaignId);
        if (!context.mounted) return;
        final message = switch (outcome) {
          SaveOutcome.saved => 'Saved. Find it under the bookmark on the Tasks tab.',
          SaveOutcome.removed => 'Removed from saved.',
          SaveOutcome.listFull => 'You can save up to 30 campaigns. Remove one to save this.',
        };
        // Replaces the last message instead of queuing behind it, so quick taps each get an answer at once.
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(message)));
      },
    );
  }
}

/// Opens the phone's share sheet with a short message and the person's referral code.
class _ShareButton extends ConsumerWidget {
  const _ShareButton({required this.campaign});

  final CampaignModel campaign;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(Icons.share_rounded),
      tooltip: 'Share',
      onPressed: () async {
        final referralCode = ref.read(authStateProvider).value?.referralCode;
        try {
          await ref.read(shareTextProvider)(campaignShareText(campaign, referralCode: referralCode));
        } catch (_) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Could not open sharing on this phone.')));
        }
      },
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
              ? Text(
                  '₹${task.rewardAmountValue!.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 12.5, color: AppColors.success),
                )
              : null,
          trailing: const Icon(Icons.chevron_right, color: AppColors.slate300),
        ),
      ),
    );
  }
}
