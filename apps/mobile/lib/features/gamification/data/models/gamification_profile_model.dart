import 'package:freezed_annotation/freezed_annotation.dart';

part 'gamification_profile_model.freezed.dart';
part 'gamification_profile_model.g.dart';

/// Mirrors `GET /gamification/profile`'s raw `UserGamificationProfile` row.
@freezed
abstract class GamificationProfileModel with _$GamificationProfileModel {
  const factory GamificationProfileModel({
    required String id,
    required String userId,
    @Default(1) int level,
    @Default(0) int xp,
    @Default(0) int currentStreak,
    @Default(0) int longestStreak,
  }) = _GamificationProfileModel;

  factory GamificationProfileModel.fromJson(Map<String, dynamic> json) =>
      _$GamificationProfileModelFromJson(json);
}
