import { MerchantStatus, MerchantVerificationStatus } from '@prisma/client';

export interface MerchantProfile {
  id: string;
  userId: string;
  businessName: string;
  legalBusinessName: string | null;
  businessType: string | null;
  businessCategory: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  registrationNumber: string | null;
  website: string | null;
  email: string;
  phone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  logoUrl: string | null;
  description: string | null;
  verificationStatus: MerchantVerificationStatus;
  status: MerchantStatus;
  kycCompletedAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface DashboardData {
  merchant: {
    id: string;
    businessName: string;
    email: string;
    verificationStatus: MerchantVerificationStatus;
    status: MerchantStatus;
    logoUrl: string | null;
  };
  wallet: {
    availableBalance: number;
    reservedBalance: number;
    totalTopUp: number;
    totalSpent: number;
  } | null;
  campaigns: {
    total: number;
    active: number;
    completed: number;
    pending: number;
  };
  recentTransactions: unknown[];
  recentNotifications: unknown[];
}

export interface RegisterMerchantInput {
  businessName: string;
  legalBusinessName?: string;
  businessType?: string;
  businessCategory?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationNumber?: string;
  website?: string;
  email: string;
  phone: string;
  addressLine1?: string;
  addressLine2?: string;
  countryId?: string;
  stateId?: string;
  cityId?: string;
  postalCode?: string;
  description?: string;
}
