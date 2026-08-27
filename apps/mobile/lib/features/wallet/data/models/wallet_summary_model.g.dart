// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet_summary_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_WalletSummaryModel _$WalletSummaryModelFromJson(Map<String, dynamic> json) =>
    _WalletSummaryModel(
      id: json['id'] as String,
      availableBalance: json['availableBalance'] as String,
      pendingBalance: json['pendingBalance'] as String,
      lockedBalance: json['lockedBalance'] as String,
      lifetimeEarnings: json['lifetimeEarnings'] as String,
    );

Map<String, dynamic> _$WalletSummaryModelToJson(_WalletSummaryModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'availableBalance': instance.availableBalance,
      'pendingBalance': instance.pendingBalance,
      'lockedBalance': instance.lockedBalance,
      'lifetimeEarnings': instance.lifetimeEarnings,
    };
