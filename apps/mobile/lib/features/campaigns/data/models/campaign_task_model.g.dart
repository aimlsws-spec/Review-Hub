// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'campaign_task_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CampaignTaskModel _$CampaignTaskModelFromJson(Map<String, dynamic> json) =>
    _CampaignTaskModel(
      id: json['id'] as String,
      campaignId: json['campaignId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      instructions: json['instructions'] as String?,
      taskType: json['taskType'] as String,
      verificationType: json['verificationType'] as String,
      taskOrder: (json['taskOrder'] as num?)?.toInt() ?? 0,
      rewardAmount: json['rewardAmount'] as String?,
      required: json['required'] as bool? ?? true,
      minimumTimeSeconds: (json['minimumTimeSeconds'] as num?)?.toInt() ?? 0,
      proofRequired: json['proofRequired'] as bool? ?? true,
      proofType: json['proofType'] as String?,
    );

Map<String, dynamic> _$CampaignTaskModelToJson(_CampaignTaskModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'campaignId': instance.campaignId,
      'title': instance.title,
      'description': instance.description,
      'instructions': instance.instructions,
      'taskType': instance.taskType,
      'verificationType': instance.verificationType,
      'taskOrder': instance.taskOrder,
      'rewardAmount': instance.rewardAmount,
      'required': instance.required,
      'minimumTimeSeconds': instance.minimumTimeSeconds,
      'proofRequired': instance.proofRequired,
      'proofType': instance.proofType,
    };
