// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'location_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_StateModel _$StateModelFromJson(Map<String, dynamic> json) => _StateModel(
  id: json['id'] as String,
  name: json['name'] as String? ?? '',
  code: json['code'] as String?,
);

Map<String, dynamic> _$StateModelToJson(_StateModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'code': instance.code,
    };

_CityModel _$CityModelFromJson(Map<String, dynamic> json) =>
    _CityModel(id: json['id'] as String, name: json['name'] as String? ?? '');

Map<String, dynamic> _$CityModelToJson(_CityModel instance) =>
    <String, dynamic>{'id': instance.id, 'name': instance.name};
