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
  tier:
      $enumDecodeNullable(
        _$GamificationTierEnumMap,
        json['tier'],
        unknownValue: GamificationTier.bronze,
      ) ??
      GamificationTier.bronze,
  nextTier: $enumDecodeNullable(
    _$GamificationTierEnumMap,
    json['nextTier'],
    unknownValue: JsonKey.nullForUndefinedEnumValue,
  ),
  xpToNextTier: (json['xpToNextTier'] as num?)?.toInt(),
  progressPercent: (json['progressPercent'] as num?)?.toInt() ?? 0,
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
  'tier': _$GamificationTierEnumMap[instance.tier]!,
  'nextTier': _$GamificationTierEnumMap[instance.nextTier],
  'xpToNextTier': instance.xpToNextTier,
  'progressPercent': instance.progressPercent,
};

const _$GamificationTierEnumMap = {
  GamificationTier.bronze: 'BRONZE',
  GamificationTier.silver: 'SILVER',
  GamificationTier.gold: 'GOLD',
  GamificationTier.diamond: 'DIAMOND',
  GamificationTier.platinum: 'PLATINUM',
};
