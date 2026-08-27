import 'package:freezed_annotation/freezed_annotation.dart';

part 'referral_model.freezed.dart';
part 'referral_model.g.dart';

/// A minimal summary of the referred user, as embedded by
/// `ReferralRepository.findByReferrer()`'s `include`.
@freezed
abstract class ReferredUserSummary with _$ReferredUserSummary {
  const factory ReferredUserSummary({
    required String id,
    required String firstName,
    required String lastName,
    required DateTime createdAt,
  }) = _ReferredUserSummary;

  factory ReferredUserSummary.fromJson(Map<String, dynamic> json) => _$ReferredUserSummaryFromJson(json);
}

/// Mirrors the raw `Referral` Prisma row returned by `GET /referrals/me`.
@freezed
abstract class ReferralModel with _$ReferralModel {
  const factory ReferralModel({
    required String id,
    required String referralCode,
    @Default(false) bool rewardIssued,
    String? rewardAmount,
    DateTime? completedAt,
    required DateTime createdAt,
    required ReferredUserSummary referredUser,
  }) = _ReferralModel;

  factory ReferralModel.fromJson(Map<String, dynamic> json) => _$ReferralModelFromJson(json);
}

extension ReferralModelX on ReferralModel {
  double? get rewardAmountValue => rewardAmount == null ? null : double.tryParse(rewardAmount!);
}

/// Mirrors `ReferralRepository.getStats()`'s plain object — note
/// `totalRewardEarned` is converted to a JS `Number()` on the backend
/// before serialization, so (unlike most money fields) it arrives as a
/// JSON number, not a string.
@freezed
abstract class ReferralStatsModel with _$ReferralStatsModel {
  const factory ReferralStatsModel({
    @Default(0) int totalReferred,
    @Default(0) int totalRewarded,
    @Default(0) double totalRewardEarned,
  }) = _ReferralStatsModel;

  factory ReferralStatsModel.fromJson(Map<String, dynamic> json) => _$ReferralStatsModelFromJson(json);
}
