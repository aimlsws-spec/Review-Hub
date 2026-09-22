// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chatbot_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ChatSourceModel _$ChatSourceModelFromJson(Map<String, dynamic> json) =>
    _ChatSourceModel(
      kind: json['kind'] as String? ?? '',
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
    );

Map<String, dynamic> _$ChatSourceModelToJson(_ChatSourceModel instance) =>
    <String, dynamic>{
      'kind': instance.kind,
      'id': instance.id,
      'title': instance.title,
    };

_ChatbotReplyModel _$ChatbotReplyModelFromJson(Map<String, dynamic> json) =>
    _ChatbotReplyModel(
      reply: json['reply'] as String? ?? '',
      suggestHandoff: json['suggestHandoff'] as bool? ?? false,
      suggestedCategory: json['suggestedCategory'] as String? ?? 'GENERAL',
      sources:
          (json['sources'] as List<dynamic>?)
              ?.map((e) => ChatSourceModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ChatSourceModel>[],
    );

Map<String, dynamic> _$ChatbotReplyModelToJson(_ChatbotReplyModel instance) =>
    <String, dynamic>{
      'reply': instance.reply,
      'suggestHandoff': instance.suggestHandoff,
      'suggestedCategory': instance.suggestedCategory,
      'sources': instance.sources,
    };
