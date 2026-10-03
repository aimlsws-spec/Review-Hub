import 'package:freezed_annotation/freezed_annotation.dart';

part 'gamification_profile_model.freezed.dart';
part 'gamification_profile_model.g.dart';

/// Named tiers over the level, as the server works them out (gamification/tiers.ts).
@JsonEnum(fieldRename: FieldRename.screamingSnake)
enum GamificationTier { bronze, silver, gold, diamond, platinum }

extension GamificationTierX on GamificationTier {
  String get label => switch (this) {
    GamificationTier.bronze => 'Bronze',
    GamificationTier.silver => 'Silver',
    GamificationTier.gold => 'Gold',
    GamificationTier.diamond => 'Diamond',
    GamificationTier.platinum => 'Platinum',
  };
}

/// Mirrors `GET /gamification/profile`: the `UserGamificationProfile` row plus the tier and the way to the next one.
@freezed
abstract class GamificationProfileModel with _$GamificationProfileModel {
  const factory GamificationProfileModel({
    required String id,
    required String userId,
    @Default(1) int level,
    @Default(0) int xp,
    @Default(0) int currentStreak,
    @Default(0) int longestStreak,
    @Default(GamificationTier.bronze) @JsonKey(unknownEnumValue: GamificationTier.bronze) GamificationTier tier,

    /// Null at the top tier.
    @JsonKey(unknownEnumValue: JsonKey.nullForUndefinedEnumValue) GamificationTier? nextTier,

    /// XP still needed for the next tier; null at the top tier.
    int? xpToNextTier,

    /// 0–100 through the current tier.
    @Default(0) int progressPercent,
  }) = _GamificationProfileModel;

  factory GamificationProfileModel.fromJson(Map<String, dynamic> json) => _$GamificationProfileModelFromJson(json);
}
