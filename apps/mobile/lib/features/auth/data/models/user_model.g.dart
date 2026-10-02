// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_UserModel _$UserModelFromJson(Map<String, dynamic> json) => _UserModel(
  id: json['id'] as String,
  firstName: json['firstName'] as String,
  lastName: json['lastName'] as String,
  email: json['email'] as String?,
  phone: json['phone'] as String?,
  avatarUrl: json['avatarUrl'] as String?,
  status: json['status'] as String,
  emailVerifiedAt: json['emailVerifiedAt'] == null
      ? null
      : DateTime.parse(json['emailVerifiedAt'] as String),
  phoneVerifiedAt: json['phoneVerifiedAt'] == null
      ? null
      : DateTime.parse(json['phoneVerifiedAt'] as String),
  isTwoFactorEnabled: json['isTwoFactorEnabled'] as bool? ?? false,
  hasPassword: json['hasPassword'] as bool? ?? true,
  referralCode: json['referralCode'] as String?,
  timezone: json['timezone'] as String?,
  language: json['language'] as String?,
  dateOfBirth: json['dateOfBirth'] as String?,
  gender: json['gender'] as String?,
  countryId: json['countryId'] as String?,
  stateId: json['stateId'] as String?,
  cityId: json['cityId'] as String?,
  pendingPolicies:
      (json['pendingPolicies'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  createdAt: json['createdAt'] == null
      ? null
      : DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$UserModelToJson(_UserModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'email': instance.email,
      'phone': instance.phone,
      'avatarUrl': instance.avatarUrl,
      'status': instance.status,
      'emailVerifiedAt': instance.emailVerifiedAt?.toIso8601String(),
      'phoneVerifiedAt': instance.phoneVerifiedAt?.toIso8601String(),
      'isTwoFactorEnabled': instance.isTwoFactorEnabled,
      'hasPassword': instance.hasPassword,
      'referralCode': instance.referralCode,
      'timezone': instance.timezone,
      'language': instance.language,
      'dateOfBirth': instance.dateOfBirth,
      'gender': instance.gender,
      'countryId': instance.countryId,
      'stateId': instance.stateId,
      'cityId': instance.cityId,
      'pendingPolicies': instance.pendingPolicies,
      'createdAt': instance.createdAt?.toIso8601String(),
    };
