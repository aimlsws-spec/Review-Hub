// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_challenge_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LoginChallengeModel _$LoginChallengeModelFromJson(Map<String, dynamic> json) =>
    _LoginChallengeModel(
      challengeToken: json['challengeToken'] as String,
      reason:
          $enumDecodeNullable(
            _$LoginChallengeReasonEnumMap,
            json['reason'],
            unknownValue: LoginChallengeReason.newDevice,
          ) ??
          LoginChallengeReason.newDevice,
      expiresIn: (json['expiresIn'] as num).toInt(),
      sentTo:
          (json['sentTo'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
    );

Map<String, dynamic> _$LoginChallengeModelToJson(
  _LoginChallengeModel instance,
) => <String, dynamic>{
  'challengeToken': instance.challengeToken,
  'reason': _$LoginChallengeReasonEnumMap[instance.reason]!,
  'expiresIn': instance.expiresIn,
  'sentTo': instance.sentTo,
};

const _$LoginChallengeReasonEnumMap = {
  LoginChallengeReason.twoFactor: 'TWO_FACTOR',
  LoginChallengeReason.newDevice: 'NEW_DEVICE',
};
