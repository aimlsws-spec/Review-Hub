import 'package:freezed_annotation/freezed_annotation.dart';

part 'notification_model.freezed.dart';
part 'notification_model.g.dart';

/// Mirrors the raw `Notification` Prisma row returned by `GET /notifications`.
@freezed
abstract class NotificationModel with _$NotificationModel {
  const factory NotificationModel({
    required String id,
    required String userId,
    String? templateId,
    required String title,
    required String message,
    required String type,
    required String channel,
    required String status,
    Map<String, dynamic>? data,
    DateTime? scheduledAt,
    DateTime? sentAt,
    DateTime? deliveredAt,
    DateTime? readAt,
    String? failedReason,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? deletedAt,
  }) = _NotificationModel;

  factory NotificationModel.fromJson(Map<String, dynamic> json) => _$NotificationModelFromJson(json);
}

extension NotificationModelX on NotificationModel {
  bool get isUnread => readAt == null;
}
