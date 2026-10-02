// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_challenge_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LoginChallengeModel _$LoginChallengeModelFromJson(Map<String, dynamic> json) =>
    _LoginChallengeModel(
      challengeToken: json['challengeToken'] as String,
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
  'expiresIn': instance.expiresIn,
  'sentTo': instance.sentTo,
};
