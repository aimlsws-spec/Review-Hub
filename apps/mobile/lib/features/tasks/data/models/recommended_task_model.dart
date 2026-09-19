import 'package:freezed_annotation/freezed_annotation.dart';

part 'recommended_task_model.freezed.dart';
part 'recommended_task_model.g.dart';

/// Mirrors `GET /tasks/recommended`'s `RecommendedTaskDto` — a transparent,
/// rule-based ranking (reward + speed + the user's own category history),
/// not ML/LLM scoring.
@freezed
abstract class RecommendedTaskModel with _$RecommendedTaskModel {
  const factory RecommendedTaskModel({
    required String taskId,
    required String campaignId,
    required String title,
    required String campaignTitle,
    String? thumbnailUrl,
    required String rewardAmount,
    required int minimumTimeSeconds,
    required bool isHighReward,
    required bool isQuickTask,
  }) = _RecommendedTaskModel;

  factory RecommendedTaskModel.fromJson(Map<String, dynamic> json) => _$RecommendedTaskModelFromJson(json);
}

extension RecommendedTaskModelX on RecommendedTaskModel {
  double get rewardAmountValue => double.tryParse(rewardAmount) ?? 0;
}
