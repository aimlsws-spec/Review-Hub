import 'package:freezed_annotation/freezed_annotation.dart';

part 'earnings_model.freezed.dart';
part 'earnings_model.g.dart';

double _toDouble(Object? value) => value is num ? value.toDouble() : double.tryParse('$value') ?? 0;

/// `GET /wallet/earnings`: what the person has earned, split by where it came from. Clawed-back rewards are already
/// taken off [tasks]. There is no cashback on the platform yet, so there is no cashback figure.
@freezed
abstract class EarningsBreakdownModel with _$EarningsBreakdownModel {
  const factory EarningsBreakdownModel({
    @JsonKey(fromJson: _toDouble) @Default(0) double tasks,
    @JsonKey(fromJson: _toDouble) @Default(0) double bonus,
    @JsonKey(fromJson: _toDouble) @Default(0) double referral,
    @JsonKey(fromJson: _toDouble) @Default(0) double total,
  }) = _EarningsBreakdownModel;

  factory EarningsBreakdownModel.fromJson(Map<String, dynamic> json) => _$EarningsBreakdownModelFromJson(json);
}

/// One bar of the earnings chart: a day ("2026-09-21") or a month ("2026-09").
@freezed
abstract class EarningsPointModel with _$EarningsPointModel {
  const factory EarningsPointModel({@Default('') String key, @JsonKey(fromJson: _toDouble) @Default(0) double amount}) =
      _EarningsPointModel;

  factory EarningsPointModel.fromJson(Map<String, dynamic> json) => _$EarningsPointModelFromJson(json);
}

/// The chart's two views: the last 7 days, or the last 6 months.
@JsonEnum()
enum EarningsPeriod { week, month }

/// `GET /wallet/earnings/chart`.
@freezed
abstract class EarningsChartModel with _$EarningsChartModel {
  const factory EarningsChartModel({
    @Default(EarningsPeriod.week) @JsonKey(unknownEnumValue: EarningsPeriod.week) EarningsPeriod period,
    @Default(<EarningsPointModel>[]) List<EarningsPointModel> points,
    @JsonKey(fromJson: _toDouble) @Default(0) double total,
  }) = _EarningsChartModel;

  factory EarningsChartModel.fromJson(Map<String, dynamic> json) => _$EarningsChartModelFromJson(json);
}
