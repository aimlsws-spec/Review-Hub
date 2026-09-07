// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'daily_reward_result_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DailyRewardResultModel _$DailyRewardResultModelFromJson(
  Map<String, dynamic> json,
) => _DailyRewardResultModel(
  prize: DailyRewardPrizeSummary.fromJson(
    json['prize'] as Map<String, dynamic>,
  ),
);

Map<String, dynamic> _$DailyRewardResultModelToJson(
  _DailyRewardResultModel instance,
) => <String, dynamic>{'prize': instance.prize};

_DailyRewardPrizeSummary _$DailyRewardPrizeSummaryFromJson(
  Map<String, dynamic> json,
) => _DailyRewardPrizeSummary(
  id: json['id'] as String,
  label: json['label'] as String,
  amount: (json['amount'] as num).toDouble(),
);

Map<String, dynamic> _$DailyRewardPrizeSummaryToJson(
  _DailyRewardPrizeSummary instance,
) => <String, dynamic>{
  'id': instance.id,
  'label': instance.label,
  'amount': instance.amount,
};
