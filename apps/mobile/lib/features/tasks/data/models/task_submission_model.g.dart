// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task_submission_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_TaskSubmissionModel _$TaskSubmissionModelFromJson(Map<String, dynamic> json) =>
    _TaskSubmissionModel(
      id: json['id'] as String,
      taskId: json['taskId'] as String,
      status: json['status'] as String,
      verificationSource: json['verificationSource'] as String,
      attemptNumber: (json['attemptNumber'] as num?)?.toInt() ?? 1,
      fileUrl: json['fileUrl'] as String?,
      externalUrl: json['externalUrl'] as String?,
      textAnswer: json['textAnswer'] as String?,
      aiConfidence: (json['aiConfidence'] as num?)?.toDouble(),
      rejectionReason: json['rejectionReason'] as String?,
      rewardAmount: json['rewardAmount'] as String?,
      rewardCreditedAt: json['rewardCreditedAt'] == null
          ? null
          : DateTime.parse(json['rewardCreditedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$TaskSubmissionModelToJson(
  _TaskSubmissionModel instance,
) => <String, dynamic>{
  'id': instance.id,
  'taskId': instance.taskId,
  'status': instance.status,
  'verificationSource': instance.verificationSource,
  'attemptNumber': instance.attemptNumber,
  'fileUrl': instance.fileUrl,
  'externalUrl': instance.externalUrl,
  'textAnswer': instance.textAnswer,
  'aiConfidence': instance.aiConfidence,
  'rejectionReason': instance.rejectionReason,
  'rewardAmount': instance.rewardAmount,
  'rewardCreditedAt': instance.rewardCreditedAt?.toIso8601String(),
  'createdAt': instance.createdAt.toIso8601String(),
};
