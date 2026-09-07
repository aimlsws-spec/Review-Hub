import 'package:freezed_annotation/freezed_annotation.dart';

part 'badge_model.freezed.dart';
part 'badge_model.g.dart';

/// Mirrors `GET /gamification/badges`'s shape — every active badge, flagged
/// with whether the current user has earned it.
@freezed
abstract class BadgeModel with _$BadgeModel {
  const factory BadgeModel({
    required String id,
    required String code,
    required String name,
    required String description,
    String? iconUrl,
    required String criteriaType,
    required int criteriaValue,
    @Default(true) bool isActive,
    @Default(false) bool earned,
    DateTime? earnedAt,
  }) = _BadgeModel;

  factory BadgeModel.fromJson(Map<String, dynamic> json) => _$BadgeModelFromJson(json);
}
