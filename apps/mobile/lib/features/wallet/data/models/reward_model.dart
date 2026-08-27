import 'package:freezed_annotation/freezed_annotation.dart';

part 'reward_model.freezed.dart';
part 'reward_model.g.dart';

/// Mirrors the raw `Reward` Prisma row returned by `GET /wallet/rewards`.
@freezed
abstract class RewardModel with _$RewardModel {
  const factory RewardModel({
    required String id,
    required String campaignId,
    required String submissionId,
    required String rewardType,
    required String amount,
    required String status,
    DateTime? approvedAt,
    DateTime? creditedAt,
    String? failedReason,
    required DateTime createdAt,
  }) = _RewardModel;

  factory RewardModel.fromJson(Map<String, dynamic> json) => _$RewardModelFromJson(json);
}

extension RewardModelX on RewardModel {
  double get amountValue => double.tryParse(amount) ?? 0;
}
