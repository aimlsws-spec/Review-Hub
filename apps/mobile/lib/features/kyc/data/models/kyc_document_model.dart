import 'package:freezed_annotation/freezed_annotation.dart';

part 'kyc_document_model.freezed.dart';
part 'kyc_document_model.g.dart';

/// Mirrors the raw `UserKycDocument` Prisma row returned by
/// `GET /kyc/documents` and `POST /kyc/documents`.
@freezed
abstract class KycDocumentModel with _$KycDocumentModel {
  const factory KycDocumentModel({
    required String id,
    required String userId,
    required String documentType,
    String? fileUploadId,
    String? documentNumber,
    required String verificationStatus,
    String? verifiedBy,
    DateTime? verifiedAt,
    String? rejectionReason,
    DateTime? expiresAt,
    required DateTime createdAt,
    required DateTime updatedAt,
    DateTime? deletedAt,
  }) = _KycDocumentModel;

  factory KycDocumentModel.fromJson(Map<String, dynamic> json) => _$KycDocumentModelFromJson(json);
}

extension KycDocumentModelX on KycDocumentModel {
  bool get isApproved => verificationStatus == 'APPROVED';
  bool get isRejected => verificationStatus == 'REJECTED';
  bool get isPending => verificationStatus == 'PENDING' || verificationStatus == 'UNDER_REVIEW';
}
