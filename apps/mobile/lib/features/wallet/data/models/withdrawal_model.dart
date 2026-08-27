import 'package:freezed_annotation/freezed_annotation.dart';

part 'withdrawal_model.freezed.dart';
part 'withdrawal_model.g.dart';

/// Mirrors the raw `WithdrawalRequest` Prisma row.
@freezed
abstract class WithdrawalModel with _$WithdrawalModel {
  const factory WithdrawalModel({
    required String id,
    required String amount,
    required String processingFee,
    required String finalAmount,
    required String status,
    String? rejectionReason,
    DateTime? processedAt,
    required DateTime createdAt,
  }) = _WithdrawalModel;

  factory WithdrawalModel.fromJson(Map<String, dynamic> json) => _$WithdrawalModelFromJson(json);
}

extension WithdrawalModelX on WithdrawalModel {
  double get amountValue => double.tryParse(amount) ?? 0;
  double get finalAmountValue => double.tryParse(finalAmount) ?? 0;
}
