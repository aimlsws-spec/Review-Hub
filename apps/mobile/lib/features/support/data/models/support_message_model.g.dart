// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_message_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SupportMessageModel _$SupportMessageModelFromJson(Map<String, dynamic> json) =>
    _SupportMessageModel(
      id: json['id'] as String,
      ticketId: json['ticketId'] as String,
      senderId: json['senderId'] as String,
      senderType: json['senderType'] as String,
      message: json['message'] as String,
      attachments: json['attachments'] as String?,
      internalNote: json['internalNote'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$SupportMessageModelToJson(
  _SupportMessageModel instance,
) => <String, dynamic>{
  'id': instance.id,
  'ticketId': instance.ticketId,
  'senderId': instance.senderId,
  'senderType': instance.senderType,
  'message': instance.message,
  'attachments': instance.attachments,
  'internalNote': instance.internalNote,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};
