// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reward_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RewardModel _$RewardModelFromJson(Map<String, dynamic> json) => _RewardModel(
  id: json['id'] as String,
  campaignId: json['campaignId'] as String,
  submissionId: json['submissionId'] as String,
  rewardType: json['rewardType'] as String,
  amount: json['amount'] as String,
  status: json['status'] as String,
  approvedAt: json['approvedAt'] == null
      ? null
      : DateTime.parse(json['approvedAt'] as String),
  creditedAt: json['creditedAt'] == null
      ? null
      : DateTime.parse(json['creditedAt'] as String),
  failedReason: json['failedReason'] as String?,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$RewardModelToJson(_RewardModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'campaignId': instance.campaignId,
      'submissionId': instance.submissionId,
      'rewardType': instance.rewardType,
      'amount': instance.amount,
      'status': instance.status,
      'approvedAt': instance.approvedAt?.toIso8601String(),
      'creditedAt': instance.creditedAt?.toIso8601String(),
      'failedReason': instance.failedReason,
      'createdAt': instance.createdAt.toIso8601String(),
    };
