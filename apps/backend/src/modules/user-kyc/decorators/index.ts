import { SetMetadata } from '@nestjs/common';

export const REQUIRES_IDENTITY_VERIFICATION_KEY = 'requiresIdentityVerification';

/**
 * Marks a route as an earning feature: IdentityVerificationGuard refuses it until the person has uploaded PAN or an
 * identity document (see IDENTITY_DOCUMENT_TYPES).
 */
export const RequiresIdentityVerification = () => SetMetadata(REQUIRES_IDENTITY_VERIFICATION_KEY, true);
