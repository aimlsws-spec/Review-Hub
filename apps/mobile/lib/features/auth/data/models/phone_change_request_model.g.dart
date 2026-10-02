// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'phone_change_request_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PhoneChangeRequestModel _$PhoneChangeRequestModelFromJson(
  Map<String, dynamic> json,
) => _PhoneChangeRequestModel(
  expiresIn: (json['expiresIn'] as num).toInt(),
  sentTo: json['sentTo'] as String,
);

Map<String, dynamic> _$PhoneChangeRequestModelToJson(
  _PhoneChangeRequestModel instance,
) => <String, dynamic>{
  'expiresIn': instance.expiresIn,
  'sentTo': instance.sentTo,
};
