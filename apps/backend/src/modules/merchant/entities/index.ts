import { MerchantStatus, MerchantVerificationStatus } from '@prisma/client';

export class MerchantEntity {
  id!: string;
  userId!: string;
  businessName!: string;
  legalBusinessName!: string | null;
  businessType!: string | null;
  businessCategory!: string | null;
  gstNumber!: string | null;
  panNumber!: string | null;
  registrationNumber!: string | null;
  website!: string | null;
  email!: string;
  phone!: string;
  addressLine1!: string | null;
  addressLine2!: string | null;
  countryId!: string | null;
  stateId!: string | null;
  cityId!: string | null;
  postalCode!: string | null;
  logoUrl!: string | null;
  description!: string | null;
  verificationStatus!: MerchantVerificationStatus;
  status!: MerchantStatus;
  creditBalance!: number;
  kycCompletedAt!: Date | null;
  verifiedAt!: Date | null;
  verifiedBy!: string | null;
  rejectedReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
