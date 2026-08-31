// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'kyc_document_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_KycDocumentModel _$KycDocumentModelFromJson(Map<String, dynamic> json) =>
    _KycDocumentModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      documentType: json['documentType'] as String,
      fileUploadId: json['fileUploadId'] as String?,
      documentNumber: json['documentNumber'] as String?,
      verificationStatus: json['verificationStatus'] as String,
      verifiedBy: json['verifiedBy'] as String?,
      verifiedAt: json['verifiedAt'] == null
          ? null
          : DateTime.parse(json['verifiedAt'] as String),
      rejectionReason: json['rejectionReason'] as String?,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      deletedAt: json['deletedAt'] == null
          ? null
          : DateTime.parse(json['deletedAt'] as String),
    );

Map<String, dynamic> _$KycDocumentModelToJson(_KycDocumentModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'documentType': instance.documentType,
      'fileUploadId': instance.fileUploadId,
      'documentNumber': instance.documentNumber,
      'verificationStatus': instance.verificationStatus,
      'verifiedBy': instance.verifiedBy,
      'verifiedAt': instance.verifiedAt?.toIso8601String(),
      'rejectionReason': instance.rejectionReason,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'deletedAt': instance.deletedAt?.toIso8601String(),
    };
