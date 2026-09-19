// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'recommended_task_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RecommendedTaskModel _$RecommendedTaskModelFromJson(
  Map<String, dynamic> json,
) => _RecommendedTaskModel(
  taskId: json['taskId'] as String,
  campaignId: json['campaignId'] as String,
  title: json['title'] as String,
  campaignTitle: json['campaignTitle'] as String,
  thumbnailUrl: json['thumbnailUrl'] as String?,
  rewardAmount: json['rewardAmount'] as String,
  minimumTimeSeconds: (json['minimumTimeSeconds'] as num).toInt(),
  isHighReward: json['isHighReward'] as bool,
  isQuickTask: json['isQuickTask'] as bool,
);

Map<String, dynamic> _$RecommendedTaskModelToJson(
  _RecommendedTaskModel instance,
) => <String, dynamic>{
  'taskId': instance.taskId,
  'campaignId': instance.campaignId,
  'title': instance.title,
  'campaignTitle': instance.campaignTitle,
  'thumbnailUrl': instance.thumbnailUrl,
  'rewardAmount': instance.rewardAmount,
  'minimumTimeSeconds': instance.minimumTimeSeconds,
  'isHighReward': instance.isHighReward,
  'isQuickTask': instance.isQuickTask,
};
