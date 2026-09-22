import { UserDocumentType } from '@prisma/client';

/** Emitted after an admin approves or rejects a user's KYC document; `reason` is set only on rejection. */
export class UserKycReviewedEvent {
  constructor(
    public readonly userId: string,
    public readonly documentId: string,
    public readonly documentType: UserDocumentType,
    public readonly reason: string | null = null,
  ) {}
}
