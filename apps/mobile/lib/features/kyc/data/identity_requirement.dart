import 'models/kyc_document_model.dart';

/// Owner's rule (7 Oct 2026), mirrored from the backend's IDENTITY_DOCUMENT_TYPES: PAN or one identity document
/// unlocks the earning features. A selfie does not count.
const kIdentityDocumentTypes = {
  'PAN',
  'AADHAAR',
  'PASSPORT',
  'DRIVING_LICENCE',
};

/// Same wording as the backend's IDENTITY_VERIFICATION_REQUIRED_MESSAGE.
const kIdentityRequiredMessage =
    'Please complete identity verification first: upload your PAN card or an identity document '
    '(Aadhaar, passport or driving licence).';

/// Whether these documents unlock the earning features: one of [kIdentityDocumentTypes] uploaded and not rejected.
/// Waiting for review counts, so nobody is held up by the admin queue.
bool hasIdentityDocument(List<KycDocumentModel> documents) => documents.any(
  (d) =>
      kIdentityDocumentTypes.contains(d.documentType) &&
      (d.isPending || d.isApproved),
);
