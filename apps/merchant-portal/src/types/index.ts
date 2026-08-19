// ============================================================
// AUTH TYPES
// ============================================================

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  status: UserStatus
  emailVerifiedAt: string | null
  phoneVerifiedAt: string | null
  isTwoFactorEnabled: boolean
  createdAt: string
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION' | 'DEACTIVATED'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
  merchant?: Merchant
}

// ============================================================
// MERCHANT TYPES
// ============================================================

export type MerchantStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DEACTIVATED'
export type MerchantVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUIRES_RESUBMISSION'

export interface Merchant {
  id: string
  userId: string
  businessName: string
  legalBusinessName: string | null
  businessType: string | null
  businessCategory: string | null
  gstNumber: string | null
  panNumber: string | null
  registrationNumber: string | null
  website: string | null
  email: string
  phone: string
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  logoUrl: string | null
  description: string | null
  verificationStatus: MerchantVerificationStatus
  status: MerchantStatus
  creditBalance: string
  commissionRate: string
  kycCompletedAt: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// TEAM TYPES
// ============================================================

export type MerchantTeamRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'ANALYST' | 'VIEWER'
export type MerchantTeamStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'

export interface TeamMember {
  id: string
  merchantId: string
  userId: string
  role: MerchantTeamRole
  status: MerchantTeamStatus
  joinedAt: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    avatarUrl: string | null
    status: UserStatus
  }
}

export interface MerchantInvitation {
  id: string
  merchantId: string
  email: string
  role: MerchantTeamRole
  status: InvitationStatus
  expiresAt: string
  createdAt: string
}

// ============================================================
// WALLET TYPES
// ============================================================

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE' | 'REFUND' | 'WITHDRAWAL' | 'BONUS' | 'REFERRAL'
export type WalletTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

export interface MerchantWallet {
  id: string
  merchantId: string
  availableBalance: string
  reservedBalance: string
  totalTopUp: string
  totalSpent: string
  createdAt: string
  updatedAt: string
}

export interface WalletTransaction {
  id: string
  type: WalletTransactionType
  status: WalletTransactionStatus
  amount: string
  balanceBefore: string
  balanceAfter: string
  referenceType: string | null
  referenceId: string | null
  remarks: string | null
  createdAt: string
}

// ============================================================
// DOCUMENT TYPES
// ============================================================

export type MerchantDocumentType = 'PAN' | 'GST' | 'BUSINESS_REGISTRATION' | 'ADDRESS_PROOF' | 'CANCELLED_CHEQUE' | 'BANK_PROOF' | 'IDENTITY_PROOF'
export type DocumentVerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

export interface MerchantDocument {
  id: string
  merchantId: string
  documentType: MerchantDocumentType
  documentNumber: string | null
  verificationStatus: DocumentVerificationStatus
  verifiedAt: string | null
  rejectionReason: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// BANK ACCOUNT TYPES
// ============================================================

export type BankVerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED'

export interface MerchantBankAccount {
  id: string
  merchantId: string
  bankName: string
  accountHolderName: string
  accountNumber: string
  ifscCode: string
  branch: string | null
  upiId: string | null
  isPrimary: boolean
  verificationStatus: BankVerificationStatus
  verifiedAt: string | null
  createdAt: string
}

// ============================================================
// CAMPAIGN TYPES
// ============================================================

export type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED'

export type CampaignType =
  | 'SOCIAL_SHARE'
  | 'SOCIAL_FOLLOW'
  | 'REVIEW'
  | 'REFERRAL'
  | 'APP_INSTALL'
  | 'VIDEO_WATCH'
  | 'WEBSITE_VISIT'
  | 'SURVEY'
  | 'CUSTOM'

export type RewardType = 'CASH' | 'POINTS' | 'COUPON' | 'GIFT_CARD' | 'PRODUCT' | 'DISCOUNT'
export type CampaignVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'

export interface Campaign {
  id: string
  merchantId: string
  title: string
  slug: string
  shortDescription: string | null
  description: string
  thumbnailUrl: string | null
  campaignType: CampaignType
  status: CampaignStatus
  rewardType: RewardType
  rewardAmount: string
  totalBudget: string
  spentBudget: string
  remainingBudget: string
  maxParticipants: number | null
  currentParticipants: number
  startAt: string | null
  endAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  totalCampaigns: number
  activeCampaigns: number
  totalParticipants: number
  totalBudget: string
  totalSpent: string
  walletBalance: string
  pendingVerification: boolean
  merchantStatus: MerchantStatus
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  timestamp: string
}

/** Matches the backend's actual paginated shape: { data, total, page, limit } — not { items, totalPages }. */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  success: false
  statusCode: number
  message: string
  code: string
  errors?: Record<string, string[]>
  timestamp: string
}

// ============================================================
// REVIEW TYPES
// ============================================================

export type SubmissionStatus =
  | 'PENDING'
  | 'AI_PROCESSING'
  | 'PENDING_MANUAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESUBMITTED'
  | 'EXPIRED'

export interface TaskSubmission {
  id: string
  taskId: string
  userId: string
  status: SubmissionStatus
  fileUrl: string | null
  externalUrl: string | null
  textAnswer: string | null
  aiConfidence: number | null
  rejectionReason: string | null
  reviewedAt: string | null
  rewardAmount: string | null
  createdAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}

// ============================================================
// MERCHANT REWARD TYPES
// ============================================================

export type RewardStatus = 'PENDING' | 'APPROVED' | 'CREDITED' | 'FAILED' | 'EXPIRED'

export interface MerchantReward {
  id: string
  userId: string
  campaignId: string
  submissionId: string
  rewardType: RewardType
  amount: string
  status: RewardStatus
  approvedAt: string | null
  creditedAt: string | null
  createdAt: string
  user?: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  campaign?: { id: string; title: string }
}

// ============================================================
// SUPPORT TYPES
// ============================================================

export type SupportTicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED'
export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type SupportCategory = 'ACCOUNT' | 'CAMPAIGN' | 'PAYMENT' | 'WITHDRAWAL' | 'REWARD' | 'BUG' | 'GENERAL'

export interface SupportMessage {
  id: string
  ticketId: string
  senderId: string
  senderType: string
  message: string
  internalNote: boolean
  createdAt: string
}

export interface SupportTicket {
  id: string
  subject: string
  description: string
  category: SupportCategory
  priority: SupportPriority
  status: SupportTicketStatus
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  messages?: SupportMessage[]
}

// ============================================================
// SETTINGS TYPES
// ============================================================

export interface NotificationPreferences {
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
}
