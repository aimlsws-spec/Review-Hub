import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../../core/config/app_config.dart';

part 'campaign_progress_model.freezed.dart';
part 'campaign_progress_model.g.dart';

/// Whether the signed-in person can do a task now. Mirrors `TaskAvailabilityState` in
/// apps/backend/src/modules/task/task-availability.ts, which the submit step also enforces.
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum TaskProgressState {
  /// Can be started and submitted.
  available,

  /// A submission is waiting to be checked or approved.
  inReview,

  /// Done as many times as the task ever allows.
  completed,

  /// Done as many times as allowed this day, week or month; see [TaskProgressModel.availableAgainAt].
  limitReached,
}

/// One task of a campaign as it stands for the signed-in person (`GET /users/me/campaigns/:id/progress`).
@freezed
abstract class TaskProgressModel with _$TaskProgressModel {
  const factory TaskProgressModel({
    required String taskId,

    /// A state this app does not know yet is treated as available: the server still refuses a task that is not.
    @Default(TaskProgressState.available)
    @JsonKey(unknownEnumValue: TaskProgressState.available)
    TaskProgressState state,
    DateTime? availableAgainAt,
    @Default(0) int timesCompleted,
  }) = _TaskProgressModel;

  factory TaskProgressModel.fromJson(Map<String, dynamic> json) => _$TaskProgressModelFromJson(json);
}

extension TaskProgressModelX on TaskProgressModel {
  bool get canStart => state == TaskProgressState.available;
}

/// The signed-in person's progress on every task of one campaign.
@freezed
abstract class CampaignProgressModel with _$CampaignProgressModel {
  const factory CampaignProgressModel({
    required String campaignId,
    @Default(false) bool joined,

    /// Every task is completed for good: nothing is left for this person in the campaign.
    @Default(false) bool allDone,
    @Default(<TaskProgressModel>[]) List<TaskProgressModel> tasks,
  }) = _CampaignProgressModel;

  factory CampaignProgressModel.fromJson(Map<String, dynamic> json) => _$CampaignProgressModelFromJson(json);
}

extension CampaignProgressModelX on CampaignProgressModel {
  /// The progress of one task, or null when the server did not mention it (treated as available).
  TaskProgressModel? forTask(String taskId) {
    for (final task in tasks) {
      if (task.taskId == taskId) return task;
    }
    return null;
  }
}

/// Which of the person's joined campaigns to list. Mirrors `JOINED_CAMPAIGN_FILTERS` in the backend.
enum JoinedCampaignFilter {
  inProgress('IN_PROGRESS'),
  completed('COMPLETED');

  const JoinedCampaignFilter(this.apiValue);

  final String apiValue;
}

/// A campaign the person joined (`GET /users/me/campaigns/joined`), with how far they got and what they earned.
@freezed
abstract class JoinedCampaignModel with _$JoinedCampaignModel {
  const factory JoinedCampaignModel({
    required String campaignId,
    required String title,
    String? thumbnailUrl,
    @Default('') String businessName,
    @Default('0') String rewardAmount,
    @Default('') String participationStatus,
    @Default('') String campaignStatus,
    DateTime? joinedAt,
    DateTime? completedAt,
    @Default(0) int tasksCompleted,
    @Default(0) int tasksTotal,

    /// Rupees credited to the person's wallet from this campaign. Arrives as a number.
    @Default(0) num earned,
  }) = _JoinedCampaignModel;

  factory JoinedCampaignModel.fromJson(Map<String, dynamic> json) => _$JoinedCampaignModelFromJson(json);
}

extension JoinedCampaignModelX on JoinedCampaignModel {
  /// The campaign's cover as an address the app can load; null when it has none.
  String? get thumbnailImageUrl {
    final path = thumbnailUrl;
    return path == null || path.isEmpty ? null : AppConfig.resolveUploadUrl(path);
  }
}
