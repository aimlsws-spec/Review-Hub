// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'redemption_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RedemptionModel _$RedemptionModelFromJson(Map<String, dynamic> json) =>
    _RedemptionModel(
      id: json['id'] as String,
      itemId: json['itemId'] as String,
      costAmount: json['costAmount'] as String,
      redemptionCode: json['redemptionCode'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$RedemptionModelToJson(_RedemptionModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'itemId': instance.itemId,
      'costAmount': instance.costAmount,
      'redemptionCode': instance.redemptionCode,
      'createdAt': instance.createdAt.toIso8601String(),
    };
