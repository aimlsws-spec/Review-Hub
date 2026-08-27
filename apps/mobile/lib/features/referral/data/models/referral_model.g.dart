// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ReferredUserSummary _$ReferredUserSummaryFromJson(Map<String, dynamic> json) =>
    _ReferredUserSummary(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$ReferredUserSummaryToJson(
  _ReferredUserSummary instance,
) => <String, dynamic>{
  'id': instance.id,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'createdAt': instance.createdAt.toIso8601String(),
};

_ReferralModel _$ReferralModelFromJson(Map<String, dynamic> json) =>
    _ReferralModel(
      id: json['id'] as String,
      referralCode: json['referralCode'] as String,
      rewardIssued: json['rewardIssued'] as bool? ?? false,
      rewardAmount: json['rewardAmount'] as String?,
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      referredUser: ReferredUserSummary.fromJson(
        json['referredUser'] as Map<String, dynamic>,
      ),
    );

Map<String, dynamic> _$ReferralModelToJson(_ReferralModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'referralCode': instance.referralCode,
      'rewardIssued': instance.rewardIssued,
      'rewardAmount': instance.rewardAmount,
      'completedAt': instance.completedAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'referredUser': instance.referredUser,
    };

_ReferralStatsModel _$ReferralStatsModelFromJson(Map<String, dynamic> json) =>
    _ReferralStatsModel(
      totalReferred: (json['totalReferred'] as num?)?.toInt() ?? 0,
      totalRewarded: (json['totalRewarded'] as num?)?.toInt() ?? 0,
      totalRewardEarned: (json['totalRewardEarned'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$ReferralStatsModelToJson(_ReferralStatsModel instance) =>
    <String, dynamic>{
      'totalReferred': instance.totalReferred,
      'totalRewarded': instance.totalRewarded,
      'totalRewardEarned': instance.totalRewardEarned,
    };
