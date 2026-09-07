import 'package:freezed_annotation/freezed_annotation.dart';

part 'daily_reward_result_model.freezed.dart';
part 'daily_reward_result_model.g.dart';

/// Mirrors `POST /gamification/daily-reward/claim`'s `{ claim, prize }`
/// response — only `prize` is needed to show the user what they won.
@freezed
abstract class DailyRewardResultModel with _$DailyRewardResultModel {
  const factory DailyRewardResultModel({
    required DailyRewardPrizeSummary prize,
  }) = _DailyRewardResultModel;

  factory DailyRewardResultModel.fromJson(Map<String, dynamic> json) =>
      _$DailyRewardResultModelFromJson(json);
}

@freezed
abstract class DailyRewardPrizeSummary with _$DailyRewardPrizeSummary {
  const factory DailyRewardPrizeSummary({
    required String id,
    required String label,
    required double amount,
  }) = _DailyRewardPrizeSummary;

  factory DailyRewardPrizeSummary.fromJson(Map<String, dynamic> json) =>
      _$DailyRewardPrizeSummaryFromJson(json);
}
