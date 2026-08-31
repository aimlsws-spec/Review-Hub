import 'package:freezed_annotation/freezed_annotation.dart';

import 'support_message_model.dart';

part 'support_ticket_model.freezed.dart';
part 'support_ticket_model.g.dart';

/// Mirrors the raw `SupportTicket` Prisma row. `messages` is only present
/// when fetched via `GET /support/tickets/:ticketId` (ordered oldest-first),
/// so it stays `null` for list-view rows.
@freezed
abstract class SupportTicketModel with _$SupportTicketModel {
  const factory SupportTicketModel({
    required String id,
    String? userId,
    String? merchantId,
    String? assignedToId,
    required String subject,
    required String description,
    required String category,
    required String priority,
    required String status,
    DateTime? resolvedAt,
    DateTime? closedAt,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? deletedAt,
    List<SupportMessageModel>? messages,
  }) = _SupportTicketModel;

  factory SupportTicketModel.fromJson(Map<String, dynamic> json) => _$SupportTicketModelFromJson(json);
}

extension SupportTicketModelX on SupportTicketModel {
  bool get canReply => status != 'RESOLVED' && status != 'CLOSED';
}
