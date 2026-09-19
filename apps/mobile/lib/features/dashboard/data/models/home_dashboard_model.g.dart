// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'home_dashboard_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_HomeDashboardModel _$HomeDashboardModelFromJson(Map<String, dynamic> json) =>
    _HomeDashboardModel(
      wallet: WalletSummaryModel.fromJson(
        json['wallet'] as Map<String, dynamic>,
      ),
      featuredCampaigns: (json['featuredCampaigns'] as List<dynamic>)
          .map((e) => CampaignModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      popularCampaigns: (json['popularCampaigns'] as List<dynamic>)
          .map((e) => CampaignModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      recommendedTasks: (json['recommendedTasks'] as List<dynamic>)
          .map((e) => RecommendedTaskModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$HomeDashboardModelToJson(_HomeDashboardModel instance) =>
    <String, dynamic>{
      'wallet': instance.wallet,
      'featuredCampaigns': instance.featuredCampaigns,
      'popularCampaigns': instance.popularCampaigns,
      'recommendedTasks': instance.recommendedTasks,
    };
