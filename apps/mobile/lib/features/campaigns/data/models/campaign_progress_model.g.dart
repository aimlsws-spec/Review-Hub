// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'campaign_progress_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_TaskProgressModel _$TaskProgressModelFromJson(Map<String, dynamic> json) =>
    _TaskProgressModel(
      taskId: json['taskId'] as String,
      state:
          $enumDecodeNullable(
            _$TaskProgressStateEnumMap,
            json['state'],
            unknownValue: TaskProgressState.available,
          ) ??
          TaskProgressState.available,
      availableAgainAt: json['availableAgainAt'] == null
          ? null
          : DateTime.parse(json['availableAgainAt'] as String),
      timesCompleted: (json['timesCompleted'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$TaskProgressModelToJson(_TaskProgressModel instance) =>
    <String, dynamic>{
      'taskId': instance.taskId,
      'state': _$TaskProgressStateEnumMap[instance.state]!,
      'availableAgainAt': instance.availableAgainAt?.toIso8601String(),
      'timesCompleted': instance.timesCompleted,
    };

const _$TaskProgressStateEnumMap = {
  TaskProgressState.available: 'AVAILABLE',
  TaskProgressState.inReview: 'IN_REVIEW',
  TaskProgressState.completed: 'COMPLETED',
  TaskProgressState.limitReached: 'LIMIT_REACHED',
};

_CampaignProgressModel _$CampaignProgressModelFromJson(
  Map<String, dynamic> json,
) => _CampaignProgressModel(
  campaignId: json['campaignId'] as String,
  joined: json['joined'] as bool? ?? false,
  allDone: json['allDone'] as bool? ?? false,
  tasks:
      (json['tasks'] as List<dynamic>?)
          ?.map((e) => TaskProgressModel.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <TaskProgressModel>[],
);

Map<String, dynamic> _$CampaignProgressModelToJson(
  _CampaignProgressModel instance,
) => <String, dynamic>{
  'campaignId': instance.campaignId,
  'joined': instance.joined,
  'allDone': instance.allDone,
  'tasks': instance.tasks,
};

_JoinedCampaignModel _$JoinedCampaignModelFromJson(Map<String, dynamic> json) =>
    _JoinedCampaignModel(
      campaignId: json['campaignId'] as String,
      title: json['title'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      businessName: json['businessName'] as String? ?? '',
      rewardAmount: json['rewardAmount'] as String? ?? '0',
      participationStatus: json['participationStatus'] as String? ?? '',
      campaignStatus: json['campaignStatus'] as String? ?? '',
      joinedAt: json['joinedAt'] == null
          ? null
          : DateTime.parse(json['joinedAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
      tasksCompleted: (json['tasksCompleted'] as num?)?.toInt() ?? 0,
      tasksTotal: (json['tasksTotal'] as num?)?.toInt() ?? 0,
      earned: json['earned'] as num? ?? 0,
    );

Map<String, dynamic> _$JoinedCampaignModelToJson(
  _JoinedCampaignModel instance,
) => <String, dynamic>{
  'campaignId': instance.campaignId,
  'title': instance.title,
  'thumbnailUrl': instance.thumbnailUrl,
  'businessName': instance.businessName,
  'rewardAmount': instance.rewardAmount,
  'participationStatus': instance.participationStatus,
  'campaignStatus': instance.campaignStatus,
  'joinedAt': instance.joinedAt?.toIso8601String(),
  'completedAt': instance.completedAt?.toIso8601String(),
  'tasksCompleted': instance.tasksCompleted,
  'tasksTotal': instance.tasksTotal,
  'earned': instance.earned,
};
