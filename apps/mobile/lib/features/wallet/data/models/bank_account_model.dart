import 'package:freezed_annotation/freezed_annotation.dart';

part 'bank_account_model.freezed.dart';
part 'bank_account_model.g.dart';

/// Mirrors the raw `UserBankAccount` Prisma row.
@freezed
abstract class BankAccountModel with _$BankAccountModel {
  const factory BankAccountModel({
    required String id,
    required String bankName,
    required String accountHolderName,
    required String accountNumber,
    required String ifscCode,
    String? branch,
    String? upiId,
    @Default(false) bool isPrimary,
    required String verificationStatus,
  }) = _BankAccountModel;

  factory BankAccountModel.fromJson(Map<String, dynamic> json) => _$BankAccountModelFromJson(json);
}

extension BankAccountModelX on BankAccountModel {
  /// e.g. "•••• 4821" for display without exposing the full number.
  String get maskedAccountNumber =>
      accountNumber.length <= 4 ? accountNumber : '•••• ${accountNumber.substring(accountNumber.length - 4)}';

  bool get isVerified => verificationStatus == 'VERIFIED';
}
