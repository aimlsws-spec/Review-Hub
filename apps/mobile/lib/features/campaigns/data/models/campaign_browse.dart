import 'campaign_model.dart';

/// How the campaign list is ordered. The values are the API's own names
/// (`apps/backend/src/common/enums/index.ts`, `CampaignSort`).
enum CampaignSort {
  featured('featured', 'Featured'),
  popular('popular', 'Popular'),
  newest('newest', 'Newest'),
  highestReward('highest_reward', 'Highest reward'),
  endingSoon('ending_soon', 'Ending soon');

  const CampaignSort(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// The kinds of campaign a person can narrow the list to. The values are the API's own `CampaignType` names; the
/// server may add more, and those simply do not get a chip until the app is updated.
enum CampaignCategory {
  review('REVIEW', 'Feedback'),
  socialShare('SOCIAL_SHARE', 'Share'),
  socialFollow('SOCIAL_FOLLOW', 'Follow'),
  referral('REFERRAL', 'Referral'),
  appInstall('APP_INSTALL', 'App install'),
  videoWatch('VIDEO_WATCH', 'Video'),
  websiteVisit('WEBSITE_VISIT', 'Website'),
  survey('SURVEY', 'Survey'),
  custom('CUSTOM', 'Other');

  const CampaignCategory(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// What the person has asked the campaign list to show.
class CampaignBrowseFilter {
  const CampaignBrowseFilter({
    this.sort = CampaignSort.featured,
    this.category,
    this.search = '',
    this.savedOnly = false,
  });

  final CampaignSort sort;

  /// Null means every kind.
  final CampaignCategory? category;
  final String search;

  /// Show only the campaigns the person saved, ignoring the rest of the filter.
  final bool savedOnly;

  /// Whether anything narrows the list, so the screen can offer to clear it.
  bool get isNarrowed => category != null || search.isNotEmpty || sort != CampaignSort.featured;

  CampaignBrowseFilter copyWith({
    CampaignSort? sort,
    CampaignCategory? category,
    bool clearCategory = false,
    String? search,
    bool? savedOnly,
  }) {
    return CampaignBrowseFilter(
      sort: sort ?? this.sort,
      category: clearCategory ? null : (category ?? this.category),
      search: search ?? this.search,
      savedOnly: savedOnly ?? this.savedOnly,
    );
  }
}

/// The words a person sends when they share a campaign, with their referral code when they have one.
///
/// It says "for completing this task", not "for a review": what is paid for is honest participation, and the
/// message should not suggest otherwise.
String campaignShareText(CampaignModel campaign, {String? referralCode}) {
  final reward = campaign.rewardAmountValue;
  final code = referralCode?.trim() ?? '';
  return [
    'Earn ${reward > 0 ? '₹${reward.toStringAsFixed(0)}' : 'rewards'} for completing a task on VIRAL KAR: ${campaign.title}',
    if (code.isNotEmpty) 'Join with my referral code $code',
  ].join('\n');
}
