import 'package:freezed_annotation/freezed_annotation.dart';

part 'redemption_model.freezed.dart';
part 'redemption_model.g.dart';

/// Mirrors `POST /marketplace/items/:itemId/redeem`'s and
/// `GET /marketplace/redemptions`'s raw `Redemption` row.
@freezed
abstract class RedemptionModel with _$RedemptionModel {
  const factory RedemptionModel({
    required String id,
    required String itemId,
    required String costAmount,
    required String redemptionCode,
    required DateTime createdAt,
  }) = _RedemptionModel;

  factory RedemptionModel.fromJson(Map<String, dynamic> json) => _$RedemptionModelFromJson(json);
}

extension RedemptionModelX on RedemptionModel {
  double get costAmountValue => double.tryParse(costAmount) ?? 0;
}
