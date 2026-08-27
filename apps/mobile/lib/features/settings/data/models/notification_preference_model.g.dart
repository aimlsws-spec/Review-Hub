// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification_preference_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_NotificationPreferenceModel _$NotificationPreferenceModelFromJson(
  Map<String, dynamic> json,
) => _NotificationPreferenceModel(
  emailEnabled: json['emailEnabled'] as bool? ?? true,
  smsEnabled: json['smsEnabled'] as bool? ?? true,
  pushEnabled: json['pushEnabled'] as bool? ?? true,
  inAppEnabled: json['inAppEnabled'] as bool? ?? true,
);

Map<String, dynamic> _$NotificationPreferenceModelToJson(
  _NotificationPreferenceModel instance,
) => <String, dynamic>{
  'emailEnabled': instance.emailEnabled,
  'smsEnabled': instance.smsEnabled,
  'pushEnabled': instance.pushEnabled,
  'inAppEnabled': instance.inAppEnabled,
};
