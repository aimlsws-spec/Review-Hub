// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_transaction_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_WalletTransactionModel _$WalletTransactionModelFromJson(
  Map<String, dynamic> json,
) => _WalletTransactionModel(
  id: json['id'] as String,
  type: json['type'] as String,
  status: json['status'] as String,
  amount: json['amount'] as String,
  balanceBefore: json['balanceBefore'] as String,
  balanceAfter: json['balanceAfter'] as String,
  referenceType: json['referenceType'] as String?,
  remarks: json['remarks'] as String?,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$WalletTransactionModelToJson(
  _WalletTransactionModel instance,
) => <String, dynamic>{
  'id': instance.id,
  'type': instance.type,
  'status': instance.status,
  'amount': instance.amount,
  'balanceBefore': instance.balanceBefore,
  'balanceAfter': instance.balanceAfter,
  'referenceType': instance.referenceType,
  'remarks': instance.remarks,
  'createdAt': instance.createdAt.toIso8601String(),
};
