// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'withdrawal_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_WithdrawalModel _$WithdrawalModelFromJson(Map<String, dynamic> json) =>
    _WithdrawalModel(
      id: json['id'] as String,
      amount: json['amount'] as String,
      processingFee: json['processingFee'] as String,
      finalAmount: json['finalAmount'] as String,
      status: json['status'] as String,
      rejectionReason: json['rejectionReason'] as String?,
      processedAt: json['processedAt'] == null
          ? null
          : DateTime.parse(json['processedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$WithdrawalModelToJson(_WithdrawalModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'amount': instance.amount,
      'processingFee': instance.processingFee,
      'finalAmount': instance.finalAmount,
      'status': instance.status,
      'rejectionReason': instance.rejectionReason,
      'processedAt': instance.processedAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
    };
