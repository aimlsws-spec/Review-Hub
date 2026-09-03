// ============================================================
// AUTH TYPES
// ============================================================

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION' | 'DEACTIVATED'

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

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

// ============================================================
// ADMIN — MERCHANTS
// ============================================================

export type MerchantStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DEACTIVATED'
export type MerchantVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUIRES_RESUBMISSION'
export type MerchantDocumentType =
  | 'PAN'
  | 'GST'
  | 'BUSINESS_REGISTRATION'
  | 'ADDRESS_PROOF'
  | 'CANCELLED_CHEQUE'
  | 'BANK_PROOF'
  | 'IDENTITY_PROOF'
export type DocumentVerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

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
  createdAt: string
  updatedAt: string
}

export interface MerchantDocument {
  id: string
  merchantId: string
  documentType: MerchantDocumentType
  documentNumber: string | null
  verificationStatus: DocumentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

export interface MerchantDetail extends Merchant {
  documents: MerchantDocument[]
}

// ============================================================
// ADMIN — PLATFORM USERS
// ============================================================

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  status: UserStatus
  emailVerifiedAt: string | null
  phoneVerifiedAt: string | null
  lastLoginAt: string | null
  referralCode: string
  createdAt: string
  deletedAt: string | null
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

export interface Campaign {
  id: string
  merchantId: string
  title: string
  slug: string
  shortDescription: string | null
  description: string
  campaignType: string
  status: CampaignStatus
  rewardType: string
  rewardAmount: string
  totalBudget: string
  spentBudget: string
  remainingBudget: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// WITHDRAWAL TYPES
// ============================================================

export type WithdrawalStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'FAILED'

export interface WithdrawalRequest {
  id: string
  walletId: string
  bankAccountId: string
  amount: string
  finalAmount: string
  status: WithdrawalStatus
  rejectionReason: string | null
  processedBy: string | null
  processedAt: string | null
  createdAt: string
  wallet?: { userId: string }
  bankAccount?: { bankName: string; accountNumber: string; accountHolderName: string }
}

// ============================================================
// MERCHANT REFUND TYPES
// ============================================================

export type MerchantRefundStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REJECTED' | 'CANCELLED'

export interface MerchantRefund {
  id: string
  merchantWalletId: string
  bankAccountId: string | null
  amount: string
  reason: string | null
  status: MerchantRefundStatus
  rejectionReason: string | null
  processedBy: string | null
  processedAt: string | null
  createdAt: string
  merchantWallet?: { merchantId: string }
  bankAccount?: { bankName: string; accountNumber: string; accountHolderName: string }
}

// ============================================================
// FRAUD FLAG TYPES
// ============================================================

export type FraudRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface FraudFlag {
  id: string
  submissionId: string
  userId: string
  riskLevel: FraudRiskLevel
  reason: string
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  user?: { id: string; firstName: string; lastName: string; email: string | null }
}

// ============================================================
// CMS TYPES
// ============================================================

export type CMSPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface CMSPage {
  id: string
  title: string
  slug: string
  content: string
  metaTitle: string | null
  metaDescription: string | null
  status: CMSPageStatus
  publishedAt: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface FAQ {
  id: string
  category: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// SETTINGS TYPES
// ============================================================

export type SettingDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY'

export interface SystemSetting {
  id: string
  key: string
  value: unknown
  dataType: SettingDataType
  category: string | null
  description: string | null
  editable: boolean
  createdAt: string
  updatedAt: string
}

export interface FeatureFlag {
  id: string
  key: string
  description: string | null
  enabled: boolean
  rolloutPercentage: number
  createdAt: string
  updatedAt: string
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
  userId: string | null
  merchantId: string | null
  assignedToId: string | null
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
// AUDIT LOG TYPES
// ============================================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'VERIFY'
  | 'EXPORT'
  | 'STATUS_CHANGE'
  | 'SUSPEND'
  | 'BAN'
  | 'RESTORE'
  | 'CONFIG_CHANGE'

export interface AuditLog {
  id: string
  actorId: string
  actorType: string
  entity: string
  entityId: string | null
  action: AuditAction
  before: unknown
  after: unknown
  ipAddress: string | null
  createdAt: string
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

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
