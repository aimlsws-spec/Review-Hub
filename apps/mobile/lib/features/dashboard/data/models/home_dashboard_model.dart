import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../campaigns/data/models/campaign_model.dart';
import '../../../tasks/data/models/recommended_task_model.dart';
import '../../../wallet/data/models/wallet_summary_model.dart';

part 'home_dashboard_model.freezed.dart';
part 'home_dashboard_model.g.dart';

@freezed
abstract class HomeDashboardModel with _$HomeDashboardModel {
  const factory HomeDashboardModel({
    required WalletSummaryModel wallet,
    required List<CampaignModel> featuredCampaigns,
    required List<CampaignModel> popularCampaigns,
    required List<RecommendedTaskModel> recommendedTasks,
  }) = _HomeDashboardModel;

  factory HomeDashboardModel.fromJson(Map<String, dynamic> json) =>
      _$HomeDashboardModelFromJson(json);
}
