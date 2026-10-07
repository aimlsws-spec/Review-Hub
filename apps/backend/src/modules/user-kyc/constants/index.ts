import { DocumentVerificationStatus, UserDocumentType } from '@prisma/client';

export const USER_DOCUMENT_STORAGE = {
  FOLDER: 'user',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;

/**
 * Owner's rule (7 Oct 2026): PAN or one identity document unlocks the earning features. A selfie does not count.
 * An upload counts straight away, while it waits for review, so new people are not held up by the admin queue; once
 * every one of them is rejected the features lock again until the person uploads a new one.
 */
export const IDENTITY_DOCUMENT_TYPES = ['PAN', 'AADHAAR', 'PASSPORT', 'DRIVING_LICENCE'] as const satisfies readonly UserDocumentType[];
export const IDENTITY_UNLOCKING_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED'] as const satisfies readonly DocumentVerificationStatus[];

/** Shown by every earning feature until the person uploads PAN or an identity document. */
export const IDENTITY_VERIFICATION_REQUIRED_MESSAGE =
  'Please complete identity verification first: upload your PAN card or an identity document (Aadhaar, passport or driving licence).';
