import 'package:freezed_annotation/freezed_annotation.dart';

part 'marketplace_item_model.freezed.dart';
part 'marketplace_item_model.g.dart';

/// Mirrors `GET /marketplace/items`'s raw `MarketplaceItem` row.
@freezed
abstract class MarketplaceItemModel with _$MarketplaceItemModel {
  const factory MarketplaceItemModel({
    required String id,
    required String title,
    required String description,
    String? thumbnailUrl,
    String? category,
    required String costAmount,
    int? stock,
    @Default(true) bool isActive,
  }) = _MarketplaceItemModel;

  factory MarketplaceItemModel.fromJson(Map<String, dynamic> json) => _$MarketplaceItemModelFromJson(json);
}

extension MarketplaceItemModelX on MarketplaceItemModel {
  double get costAmountValue => double.tryParse(costAmount) ?? 0;

  /// `null` stock means unlimited (mirrors the backend's nullable `stock` column).
  bool get isOutOfStock => stock != null && stock! <= 0;
}
