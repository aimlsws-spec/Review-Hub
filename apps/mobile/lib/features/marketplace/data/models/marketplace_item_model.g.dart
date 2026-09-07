// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'marketplace_item_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MarketplaceItemModel _$MarketplaceItemModelFromJson(
  Map<String, dynamic> json,
) => _MarketplaceItemModel(
  id: json['id'] as String,
  title: json['title'] as String,
  description: json['description'] as String,
  thumbnailUrl: json['thumbnailUrl'] as String?,
  category: json['category'] as String?,
  costAmount: json['costAmount'] as String,
  stock: (json['stock'] as num?)?.toInt(),
  isActive: json['isActive'] as bool? ?? true,
);

Map<String, dynamic> _$MarketplaceItemModelToJson(
  _MarketplaceItemModel instance,
) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'description': instance.description,
  'thumbnailUrl': instance.thumbnailUrl,
  'category': instance.category,
  'costAmount': instance.costAmount,
  'stock': instance.stock,
  'isActive': instance.isActive,
};
