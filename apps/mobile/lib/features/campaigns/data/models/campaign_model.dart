import 'package:freezed_annotation/freezed_annotation.dart';

part 'campaign_model.freezed.dart';
part 'campaign_model.g.dart';

/// Mirrors the public-facing fields of the `Campaign` Prisma model, as
/// returned raw by `CampaignRepository.findPublic()` — `campaignType`,
/// `rewardType`, and `status` are kept as plain strings (rather than a
/// hand-maintained Dart enum) since the backend already owns the source of
/// truth and may add values over time; see `TaskLabels` for display mapping.
@freezed
abstract class CampaignModel with _$CampaignModel {
  const factory CampaignModel({
    required String id,
    required String title,
    required String slug,
    String? shortDescription,
    required String description,
    String? thumbnailUrl,
    String? bannerUrl,
    required String campaignType,
    required String status,
    required String rewardType,
    required String rewardAmount,
    int? maxParticipants,
    @Default(0) int currentParticipants,
    DateTime? startAt,
    DateTime? endAt,
    @Default(false) bool featured,
  }) = _CampaignModel;

  factory CampaignModel.fromJson(Map<String, dynamic> json) => _$CampaignModelFromJson(json);
}

extension CampaignModelX on CampaignModel {
  double get rewardAmountValue => double.tryParse(rewardAmount) ?? 0;

  bool get isFull => maxParticipants != null && currentParticipants >= maxParticipants!;

  bool get isEndingSoon {
    if (endAt == null) return false;
    final diff = endAt!.difference(DateTime.now());
    return diff.inHours > 0 && diff.inHours <= 48;
  }
}
