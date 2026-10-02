// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'content_page_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ContentPageModel _$ContentPageModelFromJson(Map<String, dynamic> json) =>
    _ContentPageModel(
      slug: json['slug'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      publishedAt: json['publishedAt'] == null
          ? null
          : DateTime.parse(json['publishedAt'] as String),
      updatedAt: json['updatedAt'] == null
          ? null
          : DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$ContentPageModelToJson(_ContentPageModel instance) =>
    <String, dynamic>{
      'slug': instance.slug,
      'title': instance.title,
      'content': instance.content,
      'publishedAt': instance.publishedAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
    };
