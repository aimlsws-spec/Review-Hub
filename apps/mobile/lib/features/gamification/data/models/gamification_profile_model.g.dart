// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'gamification_profile_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_GamificationProfileModel _$GamificationProfileModelFromJson(
  Map<String, dynamic> json,
) => _GamificationProfileModel(
  id: json['id'] as String,
  userId: json['userId'] as String,
  level: (json['level'] as num?)?.toInt() ?? 1,
  xp: (json['xp'] as num?)?.toInt() ?? 0,
  currentStreak: (json['currentStreak'] as num?)?.toInt() ?? 0,
  longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$GamificationProfileModelToJson(
  _GamificationProfileModel instance,
) => <String, dynamic>{
  'id': instance.id,
  'userId': instance.userId,
  'level': instance.level,
  'xp': instance.xp,
  'currentStreak': instance.currentStreak,
  'longestStreak': instance.longestStreak,
};
