// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'badge_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BadgeModel _$BadgeModelFromJson(Map<String, dynamic> json) => _BadgeModel(
  id: json['id'] as String,
  code: json['code'] as String,
  name: json['name'] as String,
  description: json['description'] as String,
  iconUrl: json['iconUrl'] as String?,
  criteriaType: json['criteriaType'] as String,
  criteriaValue: (json['criteriaValue'] as num).toInt(),
  isActive: json['isActive'] as bool? ?? true,
  earned: json['earned'] as bool? ?? false,
  earnedAt: json['earnedAt'] == null
      ? null
      : DateTime.parse(json['earnedAt'] as String),
);

Map<String, dynamic> _$BadgeModelToJson(_BadgeModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'name': instance.name,
      'description': instance.description,
      'iconUrl': instance.iconUrl,
      'criteriaType': instance.criteriaType,
      'criteriaValue': instance.criteriaValue,
      'isActive': instance.isActive,
      'earned': instance.earned,
      'earnedAt': instance.earnedAt?.toIso8601String(),
    };
