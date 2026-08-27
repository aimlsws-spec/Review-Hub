import 'package:freezed_annotation/freezed_annotation.dart';

part 'campaign_task_model.freezed.dart';
part 'campaign_task_model.g.dart';

/// Mirrors `CampaignTaskRepository.findByCampaignId()`'s raw `CampaignTask` rows.
@freezed
abstract class CampaignTaskModel with _$CampaignTaskModel {
  const factory CampaignTaskModel({
    required String id,
    required String campaignId,
    required String title,
    String? description,
    String? instructions,
    required String taskType,
    required String verificationType,
    @Default(0) int taskOrder,
    String? rewardAmount,
    @Default(true) bool required,
    @Default(0) int minimumTimeSeconds,
    @Default(true) bool proofRequired,
    String? proofType,
  }) = _CampaignTaskModel;

  factory CampaignTaskModel.fromJson(Map<String, dynamic> json) => _$CampaignTaskModelFromJson(json);
}

extension CampaignTaskModelX on CampaignTaskModel {
  double? get rewardAmountValue => rewardAmount == null ? null : double.tryParse(rewardAmount!);

  /// Whether the submission form should offer a file picker.
  bool get acceptsFile => proofType == null || proofType == 'SCREENSHOT' || proofType == 'VIDEO';

  /// Whether the submission form should offer a link field.
  bool get acceptsUrl => taskType == 'URL' || proofType == 'URL';

  /// Whether the submission form should offer a free-text field.
  bool get acceptsText => taskType == 'TEXT' || proofType == 'TEXT';

  /// Mirrors TEXT_ASSIST_SUPPORTED_TASK_TYPES in apps/backend/src/modules/ai/constants —
  /// task types a drafted review/caption actually makes sense for.
  bool get supportsTextAssist => const {
        'GOOGLE_REVIEW',
        'PLAY_STORE_REVIEW',
        'INSTAGRAM_STORY_SHARE',
        'INSTAGRAM_COMMENT',
        'TEXT',
      }.contains(taskType);
}
