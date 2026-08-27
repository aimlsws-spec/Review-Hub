import 'package:freezed_annotation/freezed_annotation.dart';

part 'notification_preference_model.freezed.dart';
part 'notification_preference_model.g.dart';

/// Mirrors the raw `NotificationPreference` Prisma row.
@freezed
abstract class NotificationPreferenceModel with _$NotificationPreferenceModel {
  const factory NotificationPreferenceModel({
    @Default(true) bool emailEnabled,
    @Default(true) bool smsEnabled,
    @Default(true) bool pushEnabled,
    @Default(true) bool inAppEnabled,
  }) = _NotificationPreferenceModel;

  factory NotificationPreferenceModel.fromJson(Map<String, dynamic> json) =>
      _$NotificationPreferenceModelFromJson(json);
}
