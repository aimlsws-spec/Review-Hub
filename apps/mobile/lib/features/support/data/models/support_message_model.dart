import 'package:freezed_annotation/freezed_annotation.dart';

part 'support_message_model.freezed.dart';
part 'support_message_model.g.dart';

/// Mirrors the raw `SupportMessage` Prisma row returned nested inside
/// `GET /support/tickets/:ticketId` and by `POST /support/tickets/:ticketId/messages`.
@freezed
abstract class SupportMessageModel with _$SupportMessageModel {
  const factory SupportMessageModel({
    required String id,
    required String ticketId,
    required String senderId,
    required String senderType,
    required String message,
    String? attachments,
    required bool internalNote,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _SupportMessageModel;

  factory SupportMessageModel.fromJson(Map<String, dynamic> json) => _$SupportMessageModelFromJson(json);
}

extension SupportMessageModelX on SupportMessageModel {
  bool get isFromUser => senderType == 'USER';
}
