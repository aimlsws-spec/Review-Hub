// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'earnings_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EarningsBreakdownModel _$EarningsBreakdownModelFromJson(
  Map<String, dynamic> json,
) => _EarningsBreakdownModel(
  tasks: json['tasks'] == null ? 0 : _toDouble(json['tasks']),
  bonus: json['bonus'] == null ? 0 : _toDouble(json['bonus']),
  referral: json['referral'] == null ? 0 : _toDouble(json['referral']),
  total: json['total'] == null ? 0 : _toDouble(json['total']),
);

Map<String, dynamic> _$EarningsBreakdownModelToJson(
  _EarningsBreakdownModel instance,
) => <String, dynamic>{
  'tasks': instance.tasks,
  'bonus': instance.bonus,
  'referral': instance.referral,
  'total': instance.total,
};

_EarningsPointModel _$EarningsPointModelFromJson(Map<String, dynamic> json) =>
    _EarningsPointModel(
      key: json['key'] as String? ?? '',
      amount: json['amount'] == null ? 0 : _toDouble(json['amount']),
    );

Map<String, dynamic> _$EarningsPointModelToJson(_EarningsPointModel instance) =>
    <String, dynamic>{'key': instance.key, 'amount': instance.amount};

_EarningsChartModel _$EarningsChartModelFromJson(Map<String, dynamic> json) =>
    _EarningsChartModel(
      period:
          $enumDecodeNullable(
            _$EarningsPeriodEnumMap,
            json['period'],
            unknownValue: EarningsPeriod.week,
          ) ??
          EarningsPeriod.week,
      points:
          (json['points'] as List<dynamic>?)
              ?.map(
                (e) => EarningsPointModel.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const <EarningsPointModel>[],
      total: json['total'] == null ? 0 : _toDouble(json['total']),
    );

Map<String, dynamic> _$EarningsChartModelToJson(_EarningsChartModel instance) =>
    <String, dynamic>{
      'period': _$EarningsPeriodEnumMap[instance.period]!,
      'points': instance.points,
      'total': instance.total,
    };

const _$EarningsPeriodEnumMap = {
  EarningsPeriod.week: 'week',
  EarningsPeriod.month: 'month',
};
