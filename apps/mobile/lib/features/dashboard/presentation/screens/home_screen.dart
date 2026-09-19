import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/result.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/models/api_response.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../../campaigns/data/models/campaign_model.dart';
import '../../../campaigns/presentation/widgets/campaign_card.dart';
import '../../../campaigns/presentation/widgets/campaign_card_compact.dart';
import '../../../campaigns/providers/campaign_providers.dart';
import '../../../gamification/providers/gamification_providers.dart';
import '../../../notifications/providers/notification_providers.dart';
import '../../../tasks/data/models/recommended_task_model.dart';
import '../../../tasks/data/models/task_submission_model.dart';
import '../../../tasks/presentation/widgets/recommended_task_card.dart';
import '../../../tasks/providers/task_providers.dart';
import '../../../wallet/data/models/wallet_summary_model.dart';
import '../../../wallet/providers/wallet_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final walletAsync = ref.watch(walletSummaryProvider);
    final campaignsAsync = ref.watch(campaignsProvider('featured'));
    final popularCampaignsAsync = ref.watch(campaignsProvider('popular'));
    final recommendedTasksAsync = ref.watch(recommendedTasksProvider);

    final user = authState.value;
    final firstName = user?.firstName ?? 'there';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(walletSummaryProvider);
            ref.invalidate(campaignsProvider('featured'));
            ref.invalidate(campaignsProvider('popular'));
            ref.invalidate(recommendedTasksProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              _Header(firstName: firstName, avatarUrl: user?.avatarUrl),
              const SizedBox(height: 22),
              _Greeting(firstName: firstName),
              const SizedBox(height: 24),
              _WalletCard(walletAsync: walletAsync),
              const SizedBox(height: 14),
              _StatsRow(walletAsync: walletAsync),
              const SizedBox(height: 18),
              const _ReferralBanner(),
              const SizedBox(height: 26),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Available tasks', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
                  TextButton(
                    onPressed: () => context.push(RoutePaths.tasks),
                    child: const Text('See all →', style: TextStyle(color: AppColors.orange500, fontWeight: FontWeight.w700, fontSize: 13.5)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              campaignsAsync.when(
                loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
                error: (error, stack) => Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text('$error')),
                data: (result) => result.when(
                  success: (page) {
                    if (page.items.isEmpty) return const _NoCampaignsEmptyState();
                    final preview = page.items.take(3).toList();
                    return Column(
                      children: preview
                          .map((c) => CampaignCard(
                                campaign: c,
                                onTap: () => context.push(RoutePaths.campaignDetailPath(c.id)),
                              ))
                          .toList(),
                    );
                  },
                  failure: (failure) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(failure.message, style: const TextStyle(color: AppColors.danger)),
                  ),
                ),
              ),
              _RecommendedTasksSection(tasksAsync: recommendedTasksAsync),
              _PopularCampaignsSection(campaignsAsync: popularCampaignsAsync),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.firstName, required this.avatarUrl});
  final String firstName;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ClipRect(
          child: Align(
            alignment: Alignment.centerLeft,
            widthFactor: 0.18,
            child: SvgPicture.asset('assets/images/viralkar_logo.svg', height: 32),
          ),
        ),
        const Spacer(),
        const _NotificationBellButton(),
        const SizedBox(width: 10),
        _AvatarCircle(avatarUrl: avatarUrl, firstName: firstName),
      ],
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.firstName});
  final String firstName;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: AppColors.navy900),
            children: [
              const TextSpan(text: 'Hi, '),
              TextSpan(text: firstName, style: const TextStyle(color: AppColors.orange500)),
              const TextSpan(text: ' 👋'),
            ],
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Keep going! More rewards are waiting for you!',
          style: TextStyle(color: AppColors.slate500, fontSize: 12.5),
        ),
      ],
    );
  }
}

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle({required this.avatarUrl, required this.firstName});
  final String? avatarUrl;
  final String firstName;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: avatarUrl != null && avatarUrl!.isNotEmpty
          ? CachedNetworkImage(imageUrl: avatarUrl!, width: 40, height: 40, fit: BoxFit.cover)
          : Container(
              width: 40,
              height: 40,
              color: AppColors.orange100,
              alignment: Alignment.center,
              child: Text(
                firstName.isNotEmpty ? firstName[0].toUpperCase() : '?',
                style: const TextStyle(color: AppColors.orange700, fontWeight: FontWeight.w700),
              ),
            ),
    );
  }
}

class _WalletCard extends StatelessWidget {
  const _WalletCard({required this.walletAsync});

  final AsyncValue<Result<WalletSummaryModel>> walletAsync;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 110,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.navy900, Color(0xFF193255), Color(0xFFE56A00), AppColors.orange500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          stops: [0.0, 0.45, 0.75, 1.0],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.navy900.withValues(alpha: 0.2), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Left Side: Wallet Balance
                InkWell(
                  onTap: () => context.push(RoutePaths.wallet),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Wallet Balance', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              walletAsync.when(
                                loading: () => const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                                error: (err, stack) => const Text('—', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                                data: (result) {
                                  final value = result.when(success: (w) => w.availableBalanceValue, failure: (_) => null);
                                  return Text(value != null ? '₹${value.toStringAsFixed(2)}' : '—', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800));
                                },
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.chevron_right_rounded, color: Colors.white, size: 20),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Right Side: Today's Earnings Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 4))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Today's Earnings", style: TextStyle(color: AppColors.navy900, fontSize: 11, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          walletAsync.when(
                            loading: () => const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.navy900)),
                            error: (err, stack) => const Text('—', style: TextStyle(color: AppColors.navy900, fontSize: 16, fontWeight: FontWeight.w800)),
                            data: (result) {
                              final value = result.when(success: (w) => w.todayEarningsValue, failure: (_) => null);
                              return Text(value != null ? '₹${value.toStringAsFixed(2)}' : '—', style: const TextStyle(color: AppColors.navy900, fontSize: 16, fontWeight: FontWeight.w800));
                            },
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right_rounded, color: AppColors.navy900, size: 16),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
      ),
    );
  }
}

/// Placeholder tier names until product defines a real leveling scheme —
/// there's no name field on `GamificationProfileModel`, only a numeric level.
String _levelName(int level) {
  if (level >= 4) return 'Legend';
  if (level == 3) return 'Pro';
  if (level == 2) return 'Rising Star';
  return 'Newbie';
}

class _StatsRow extends ConsumerWidget {
  const _StatsRow({required this.walletAsync});
  final AsyncValue<Result<WalletSummaryModel>> walletAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(gamificationProfileProvider);
    final submissionsAsync = ref.watch(mySubmissionsProvider);

    final pendingRewards = walletAsync.value?.valueOrNull?.pendingBalanceValue;
    final completedTasks = submissionsAsync.value?.valueOrNull?.items.where((s) => s.isApproved).length;
    final streak = profileAsync.value?.valueOrNull?.currentStreak;
    final level = profileAsync.value?.valueOrNull?.level;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Row(
        children: [
          _StatTile(
            icon: Icons.monetization_on_rounded,
            iconColor: AppColors.orange500,
            iconBg: AppColors.orange50,
            label: 'Pending Rewards',
            value: pendingRewards != null ? '₹${pendingRewards.toStringAsFixed(2)}' : '—',
          ),
          const _StatDivider(),
          _StatTile(
            icon: Icons.assignment_turned_in_rounded,
            iconColor: AppColors.primary600,
            iconBg: AppColors.primary50,
            label: 'Completed Tasks',
            value: completedTasks != null ? '$completedTasks' : '—',
          ),
          const _StatDivider(),
          _StatTile(
            icon: Icons.local_fire_department_rounded,
            iconColor: AppColors.orange500,
            iconBg: AppColors.orange50,
            label: 'Daily Streak',
            value: streak != null ? '$streak Days' : '—',
          ),
          const _StatDivider(),
          _StatTile(
            icon: Icons.emoji_events_rounded,
            iconColor: AppColors.primary600,
            iconBg: AppColors.primary50,
            label: 'Current Level',
            value: level != null ? _levelName(level) : '—',
            showArrow: true,
          ),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 44, color: AppColors.slate100);
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.icon, required this.iconColor, required this.iconBg, required this.label, required this.value, this.showArrow = false});
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String value;
  final bool showArrow;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 17),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.slate500, fontSize: 10.5),
          ),
          const SizedBox(height: 3),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                value,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.navy900, fontSize: 12.5, fontWeight: FontWeight.w800),
              ),
              if (showArrow) ...[
                const SizedBox(width: 2),
                const Icon(Icons.chevron_right_rounded, color: AppColors.navy900, size: 14),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _ReferralBanner extends StatelessWidget {
  const _ReferralBanner();

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(RoutePaths.referral),
      borderRadius: BorderRadius.circular(18),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Image.asset(
          'assets/images/refer_banner.png',
          width: double.infinity,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}



class _NoCampaignsEmptyState extends StatelessWidget {
  const _NoCampaignsEmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: const BoxDecoration(color: AppColors.orange50, shape: BoxShape.circle),
            child: const Icon(Icons.campaign_rounded, color: AppColors.orange500, size: 40),
          ),
          const SizedBox(height: 20),
          const Text('No campaigns right now', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
          const SizedBox(height: 6),
          const Text(
            'Check back later or explore other opportunities.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.slate500, fontSize: 13),
          ),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => context.push(RoutePaths.tasks),
              icon: const Icon(Icons.location_on_rounded, size: 18),
              label: const Text('Explore Nearby Campaigns'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange500,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Horizontal "✨ AI Recommended for you" row — a transparent, rule-based
/// heuristic (reward + speed + the user's own category history), not
/// ML/LLM scoring; see `TaskRecommendationService`. Renders nothing when
/// there's no data yet (a fresh account, or no open tasks left to recommend).
class _RecommendedTasksSection extends StatelessWidget {
  const _RecommendedTasksSection({required this.tasksAsync});

  final AsyncValue<Result<List<RecommendedTaskModel>>> tasksAsync;

  @override
  Widget build(BuildContext context) {
    return tasksAsync.when(
      loading: () => const SizedBox(height: 172, child: Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader())),
      error: (error, stack) => const SizedBox.shrink(),
      data: (result) => result.when(
        success: (tasks) {
          if (tasks.isEmpty) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.only(top: 26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('✨ AI Recommended Tasks', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
                    InkWell(
                      onTap: () => context.push(RoutePaths.tasks),
                      child: const Row(
                        children: [
                          Text('View All', style: TextStyle(color: AppColors.primary600, fontSize: 13, fontWeight: FontWeight.w600)),
                          Icon(Icons.chevron_right_rounded, color: AppColors.primary600, size: 16),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 160,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: tasks.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final task = tasks[index];
                      return RecommendedTaskCard(
                        task: task,
                        onTap: () => context.push(RoutePaths.taskDetailPath(task.campaignId, task.taskId)),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
        failure: (failure) => const SizedBox.shrink(),
      ),
    );
  }
}

/// Horizontal "📣 Popular Campaigns" row, ranked server-side by recent join
/// counts. Renders nothing (not even a heading) when there's no data yet —
/// a fresh account, or a catalog with no join activity — rather than
/// showing an empty carousel or an error.
class _PopularCampaignsSection extends StatelessWidget {
  const _PopularCampaignsSection({required this.campaignsAsync});

  final AsyncValue<Result<PaginatedResponse<CampaignModel>>> campaignsAsync;

  @override
  Widget build(BuildContext context) {
    return campaignsAsync.when(
      loading: () => const SizedBox(height: 172, child: Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader())),
      error: (error, stack) => const SizedBox.shrink(),
      data: (result) => result.when(
        success: (page) {
          if (page.items.isEmpty) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.only(top: 26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('📣 Popular Campaigns', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.navy900)),
                    InkWell(
                      onTap: () => context.push(RoutePaths.tasks),
                      child: const Row(
                        children: [
                          Text('View All', style: TextStyle(color: AppColors.primary600, fontSize: 13, fontWeight: FontWeight.w600)),
                          Icon(Icons.chevron_right_rounded, color: AppColors.primary600, size: 16),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 148,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: page.items.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final campaign = page.items[index];
                      return CampaignCardCompact(
                        campaign: campaign,
                        onTap: () => context.push(RoutePaths.campaignDetailPath(campaign.id)),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
        failure: (failure) => const SizedBox.shrink(),
      ),
    );
  }
}

/// Bell icon in the home header showing an unread-count badge.
class _NotificationBellButton extends ConsumerWidget {
  const _NotificationBellButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCountAsync = ref.watch(unreadCountProvider);
    final unreadCount = unreadCountAsync.value?.valueOrNull ?? 0;

    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: AppColors.navy900),
          onPressed: () => context.push(RoutePaths.notifications),
        ),
        if (unreadCount > 0)
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
              child: Text(
                unreadCount > 99 ? '99+' : '$unreadCount',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
  }
}
