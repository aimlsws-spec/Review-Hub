import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/campaign_browse.dart';
import '../../data/models/campaign_model.dart';
import '../../providers/campaign_providers.dart';
import '../widgets/campaign_card.dart';

/// The "Tasks" bottom-nav tab: browse active public campaigns, narrowed by search, kind and order, or switch to the
/// ones the person saved. Tapping one opens its task list.
class CampaignsScreen extends ConsumerWidget {
  const CampaignsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final savedOnly = ref.watch(campaignBrowseFilterProvider.select((filter) => filter.savedOnly));

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        title: Text(savedOnly ? 'Saved' : 'Tasks'),
        actions: [
          IconButton(
            icon: Icon(savedOnly ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
            tooltip: savedOnly ? 'Show all campaigns' : 'Show saved campaigns',
            onPressed: () => ref.read(campaignBrowseFilterProvider.notifier).setSavedOnly(!savedOnly),
          ),
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'My submissions',
            onPressed: () => context.push(RoutePaths.mySubmissions),
          ),
        ],
      ),
      body: Column(
        children: [
          if (!savedOnly) const _SearchAndFilters(),
          Expanded(child: savedOnly ? const _SavedList() : const _BrowseList()),
        ],
      ),
    );
  }
}

class _SearchAndFilters extends ConsumerWidget {
  const _SearchAndFilters();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(campaignBrowseFilterProvider);
    final notifier = ref.read(campaignBrowseFilterProvider.notifier);
    final controller = ref.watch(campaignSearchControllerProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (context, value, _) => TextField(
              controller: controller,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search campaigns',
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
          label: 'Sort by',
          chips: [
            for (final sort in CampaignSort.values)
              ChoiceChip(
                label: Text(sort.label),
                selected: filter.sort == sort,
                onSelected: (_) => notifier.setSort(sort),
              ),
          ],
        ),
        _ChipRow(
          label: 'Kind',
          chips: [
            ChoiceChip(
              label: const Text('All'),
              selected: filter.category == null,
              onSelected: (_) => notifier.setCategory(null),
            ),
            for (final category in CampaignCategory.values)
              ChoiceChip(
                label: Text(category.label),
                selected: filter.category == category,
                onSelected: (_) => notifier.setCategory(category),
              ),
          ],
        ),
        const SizedBox(height: 4),
      ],
    );
  }
}

/// A scrolling row of chips. The label is for screen readers, so a row of "Newest, Popular…" says what it is for.
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
        // A handful of chips, so all of them are built (and readable by a screen reader) rather than built as they
        // scroll into view.
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

class _BrowseList extends ConsumerWidget {
  const _BrowseList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaignsAsync = ref.watch(browseCampaignsProvider);
    final narrowed = ref.watch(campaignBrowseFilterProvider.select((filter) => filter.isNarrowed));

    return campaignsAsync.when(
      loading: () => const PageLoader(),
      error: (error, stack) =>
          ErrorStateView(message: '$error', onRetry: () => ref.invalidate(browseCampaignsProvider)),
      data: (result) => result.when(
        success: (page) {
          if (page.items.isEmpty) {
            return narrowed
                ? EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'No campaigns match',
                    description: 'Try a different search, kind or order.',
                    action: OutlinedButton(
                      onPressed: () {
                        ref.read(campaignSearchControllerProvider).clear();
                        ref.read(campaignBrowseFilterProvider.notifier).clear();
                      },
                      child: const Text('Clear filters'),
                    ),
                  )
                : const EmptyState(
                    icon: Icons.campaign_outlined,
                    title: 'No campaigns right now',
                    description: 'Check back soon: new campaigns are added regularly.',
                  );
          }
          return _CampaignList(campaigns: page.items, onRefresh: () async => ref.invalidate(browseCampaignsProvider));
        },
        failure: (failure) =>
            ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(browseCampaignsProvider)),
      ),
    );
  }
}

class _SavedList extends ConsumerWidget {
  const _SavedList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final savedAsync = ref.watch(savedCampaignsProvider);

    return savedAsync.when(
      loading: () => const PageLoader(),
      error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(savedCampaignsProvider)),
      data: (result) => result.when(
        success: (campaigns) {
          if (campaigns.isEmpty) {
            return const EmptyState(
              icon: Icons.bookmark_border_rounded,
              title: 'Nothing saved yet',
              description: 'Tap the bookmark on a campaign to keep it here for later.',
            );
          }
          return _CampaignList(campaigns: campaigns, onRefresh: () async => ref.invalidate(savedCampaignsProvider));
        },
        failure: (failure) =>
            ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(savedCampaignsProvider)),
      ),
    );
  }
}

class _CampaignList extends StatelessWidget {
  const _CampaignList({required this.campaigns, required this.onRefresh});

  final List<CampaignModel> campaigns;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: campaigns.length,
        itemBuilder: (context, index) {
          final campaign = campaigns[index];
          return CampaignCard(
            campaign: campaign,
            onTap: () => context.push(RoutePaths.campaignDetailPath(campaign.id)),
          );
        },
      ),
    );
  }
}
