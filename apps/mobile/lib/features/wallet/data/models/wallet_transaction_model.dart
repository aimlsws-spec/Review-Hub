import 'package:freezed_annotation/freezed_annotation.dart';

part 'wallet_transaction_model.freezed.dart';
part 'wallet_transaction_model.g.dart';

/// Mirrors the raw `WalletTransaction` Prisma row returned by
/// `GET /wallet/transactions`.
@freezed
abstract class WalletTransactionModel with _$WalletTransactionModel {
  const factory WalletTransactionModel({
    required String id,
    required String type,
    required String status,
    required String amount,
    required String balanceBefore,
    required String balanceAfter,
    String? referenceType,
    String? remarks,
    required DateTime createdAt,
  }) = _WalletTransactionModel;

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) => _$WalletTransactionModelFromJson(json);
}

extension WalletTransactionModelX on WalletTransactionModel {
  double get amountValue => double.tryParse(amount) ?? 0;
  bool get isCredit => type == 'CREDIT';
}
