import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../../core/config/app_config.dart';

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

    /// Metres from the phone to the merchant's store, sent only when sorting by "Nearest"; null when the store has no
    /// location (those come last).
    double? distanceMeters,
  }) = _CampaignModel;

  factory CampaignModel.fromJson(Map<String, dynamic> json) => _$CampaignModelFromJson(json);
}

extension CampaignModelX on CampaignModel {
  double get rewardAmountValue => double.tryParse(rewardAmount) ?? 0;

  /// The merchant's cover image, as an address the app can load. The API returns an uploaded picture as a path such
  /// as `/campaign/<uuid>.jpg`, not a full address; null when the campaign has no cover.
  String? get thumbnailImageUrl => _uploadAddress(thumbnailUrl);

  /// "350 m away" or "4.2 km away", when sorting by "Nearest" and the store has a location.
  String? get distanceLabel {
    final meters = distanceMeters;
    if (meters == null) return null;
    if (meters < 1000) return '${(meters / 10).round() * 10} m away';
    return '${(meters / 1000).toStringAsFixed(meters < 10000 ? 1 : 0)} km away';
  }

  /// The picture at the top of the campaign page: the same cover, as an address the app can load.
  String? get bannerImageUrl => _uploadAddress(bannerUrl);

  bool get isFull => maxParticipants != null && currentParticipants >= maxParticipants!;

  bool get isEndingSoon {
    if (endAt == null) return false;
    final diff = endAt!.difference(DateTime.now());
    return diff.inHours > 0 && diff.inHours <= 48;
  }
}

String? _uploadAddress(String? path) => path == null || path.isEmpty ? null : AppConfig.resolveUploadUrl(path);
