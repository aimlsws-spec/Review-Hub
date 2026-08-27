// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'bank_account_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BankAccountModel _$BankAccountModelFromJson(Map<String, dynamic> json) =>
    _BankAccountModel(
      id: json['id'] as String,
      bankName: json['bankName'] as String,
      accountHolderName: json['accountHolderName'] as String,
      accountNumber: json['accountNumber'] as String,
      ifscCode: json['ifscCode'] as String,
      branch: json['branch'] as String?,
      upiId: json['upiId'] as String?,
      isPrimary: json['isPrimary'] as bool? ?? false,
      verificationStatus: json['verificationStatus'] as String,
    );

Map<String, dynamic> _$BankAccountModelToJson(_BankAccountModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'bankName': instance.bankName,
      'accountHolderName': instance.accountHolderName,
      'accountNumber': instance.accountNumber,
      'ifscCode': instance.ifscCode,
      'branch': instance.branch,
      'upiId': instance.upiId,
      'isPrimary': instance.isPrimary,
      'verificationStatus': instance.verificationStatus,
    };
