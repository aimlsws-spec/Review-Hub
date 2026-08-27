import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../providers/campaign_providers.dart';
import '../widgets/campaign_card.dart';

/// The "Tasks" bottom-nav tab — browses active public campaigns. Tapping one
/// opens its task list.
class CampaignsScreen extends ConsumerStatefulWidget {
  const CampaignsScreen({super.key});

  @override
  ConsumerState<CampaignsScreen> createState() => _CampaignsScreenState();
}

class _CampaignsScreenState extends ConsumerState<CampaignsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final campaignsAsync = ref.watch(campaignsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'My submissions',
            onPressed: () => context.push(RoutePaths.mySubmissions),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search campaigns',
                prefixIcon: Icon(Icons.search),
              ),
              onSubmitted: (value) => ref.read(campaignSearchProvider.notifier).state = value.trim(),
            ),
          ),
          Expanded(
            child: campaignsAsync.when(
              loading: () => const PageLoader(),
              error: (error, stack) => ErrorStateView(
                message: '$error',
                onRetry: () => ref.invalidate(campaignsProvider),
              ),
              data: (result) => result.when(
                success: (page) {
                  if (page.items.isEmpty) {
                    return const EmptyState(
                      icon: Icons.campaign_outlined,
                      title: 'No campaigns right now',
                      description: 'Check back soon — new campaigns are added regularly.',
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(campaignsProvider),
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      itemCount: page.items.length,
                      itemBuilder: (context, index) {
                        final campaign = page.items[index];
                        return CampaignCard(
                          campaign: campaign,
                          onTap: () => context.push(RoutePaths.campaignDetailPath(campaign.id)),
                        );
                      },
                    ),
                  );
                },
                failure: (failure) => ErrorStateView(
                  message: failure.message,
                  onRetry: () => ref.invalidate(campaignsProvider),
                ),
              ),
            ),
          ),
        ],
      ),
      backgroundColor: AppColors.slate50,
    );
  }
}
