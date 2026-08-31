// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_ticket_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SupportTicketModel _$SupportTicketModelFromJson(Map<String, dynamic> json) =>
    _SupportTicketModel(
      id: json['id'] as String,
      userId: json['userId'] as String?,
      merchantId: json['merchantId'] as String?,
      assignedToId: json['assignedToId'] as String?,
      subject: json['subject'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      status: json['status'] as String,
      resolvedAt: json['resolvedAt'] == null
          ? null
          : DateTime.parse(json['resolvedAt'] as String),
      closedAt: json['closedAt'] == null
          ? null
          : DateTime.parse(json['closedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      deletedAt: json['deletedAt'] == null
          ? null
          : DateTime.parse(json['deletedAt'] as String),
      messages: (json['messages'] as List<dynamic>?)
          ?.map((e) => SupportMessageModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$SupportTicketModelToJson(_SupportTicketModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'merchantId': instance.merchantId,
      'assignedToId': instance.assignedToId,
      'subject': instance.subject,
      'description': instance.description,
      'category': instance.category,
      'priority': instance.priority,
      'status': instance.status,
      'resolvedAt': instance.resolvedAt?.toIso8601String(),
      'closedAt': instance.closedAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'deletedAt': instance.deletedAt?.toIso8601String(),
      'messages': instance.messages,
    };
