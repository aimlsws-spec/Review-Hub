// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'campaign_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CampaignModel _$CampaignModelFromJson(Map<String, dynamic> json) =>
    _CampaignModel(
      id: json['id'] as String,
      title: json['title'] as String,
      slug: json['slug'] as String,
      shortDescription: json['shortDescription'] as String?,
      description: json['description'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      bannerUrl: json['bannerUrl'] as String?,
      campaignType: json['campaignType'] as String,
      status: json['status'] as String,
      rewardType: json['rewardType'] as String,
      rewardAmount: json['rewardAmount'] as String,
      maxParticipants: (json['maxParticipants'] as num?)?.toInt(),
      currentParticipants: (json['currentParticipants'] as num?)?.toInt() ?? 0,
      startAt: json['startAt'] == null
          ? null
          : DateTime.parse(json['startAt'] as String),
      endAt: json['endAt'] == null
          ? null
          : DateTime.parse(json['endAt'] as String),
      featured: json['featured'] as bool? ?? false,
    );

Map<String, dynamic> _$CampaignModelToJson(_CampaignModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'slug': instance.slug,
      'shortDescription': instance.shortDescription,
      'description': instance.description,
      'thumbnailUrl': instance.thumbnailUrl,
      'bannerUrl': instance.bannerUrl,
      'campaignType': instance.campaignType,
      'status': instance.status,
      'rewardType': instance.rewardType,
      'rewardAmount': instance.rewardAmount,
      'maxParticipants': instance.maxParticipants,
      'currentParticipants': instance.currentParticipants,
      'startAt': instance.startAt?.toIso8601String(),
      'endAt': instance.endAt?.toIso8601String(),
      'featured': instance.featured,
    };
