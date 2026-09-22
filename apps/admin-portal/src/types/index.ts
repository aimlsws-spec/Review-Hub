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
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED'
  verifiedAt: string | null
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

/** A bank transfer an admin recorded and credited to a merchant wallet. Mirrors POST/GET /admin/merchants/:id/wallet/top-ups. */
/** Tax kept back from one user payout. Mirrors GET /admin/tds. */
export interface TdsDeduction {
  id: string
  withdrawalId: string
  userId: string
  userName: string | null
  financialYear: string
  panNumber: string | null
  section: string
  grossAmount: string
  rate: string
  tdsAmount: string
  netAmount: string
  status: 'DEDUCTED' | 'REVERSED'
  createdAt: string
}

export interface TdsReport extends PaginatedResult<TdsDeduction> {
  financialYear: string
  summary: { deductions: number; grossPaid: number; tdsKeptBack: number }
}

/** A GST invoice, as the admin's invoice list shows it. */
export interface AdminInvoice {
  id: string
  merchantId: string
  invoiceNumber: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
  totalAmount: string
  generatedAt: string
  merchant?: { businessName: string }
}

/** A credit or debit note issued against an invoice. */
export interface InvoiceNote {
  id: string
  noteNumber: string
  type: 'CREDIT' | 'DEBIT'
  invoiceId: string
  reason: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
  totalAmount: string
  createdAt: string
}

export type ManualTopUpStatus = 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED' | 'REVERSED'

export interface MerchantManualTopUp {
  id: string
  /** A large top-up waits for a second admin before any money moves. */
  status: ManualTopUpStatus
  amount: string
  /** Empty once a top-up is rejected: the reference is given back. */
  bankReference: string | null
  rejectedReference?: string | null
  rejectionReason?: string | null
  reversalReason?: string | null
  merchantWallet?: { merchantId: string; merchant?: { businessName: string } }
  /** The day the money reached the bank, as YYYY-MM-DD. */
  receivedOn: string
  note: string | null
  recordedBy: string
  createdAt: string
  /** Only on the response to recording one. */
  balanceAfter?: number
}

export interface MerchantDetail extends Merchant {
  documents: MerchantDocument[]
  bankAccounts: MerchantBankAccount[]
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

/** A phrase in a campaign that asks for, or leans towards, a particular rating (the honest-feedback policy). */
export interface WordingFlag {
  rule: string
  /** BLOCK stops approval; REVIEW is for the moderator's judgement. */
  severity: 'BLOCK' | 'REVIEW'
  field: string
  excerpt: string
  message: string
}

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
  /** Wording flags, filled in for campaigns in the moderation queue. */
  policyFlags?: WordingFlag[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// WITHDRAWAL TYPES
// ============================================================

export type PayoutMode = 'GATEWAY' | 'MANUAL'

export type WithdrawalStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'FAILED'

export type BroadcastStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED'
export type BroadcastChannel = 'IN_APP' | 'PUSH' | 'EMAIL'
export type BroadcastType = 'PROMOTIONAL' | 'SYSTEM' | 'CAMPAIGN'
export type AudienceGender = 'MALE' | 'FEMALE' | 'OTHER'

/** Who a broadcast reaches. Every field is optional and they combine with AND; empty means every active app user. */
export interface AudienceFilter {
  stateIds?: string[]
  cityIds?: string[]
  gender?: AudienceGender
  minAge?: number
  maxAge?: number
  minLevel?: number
  maxLevel?: number
  /** true: has an approved PAN. false: does not. */
  kycVerified?: boolean
  joinedWithinDays?: number
  inactiveForDays?: number
}

/** How many users a set of filters matches, and how many each channel would really reach. */
export interface AudienceReach {
  total: number
  byChannel: Record<BroadcastChannel, number>
}

export interface Broadcast {
  id: string
  title: string
  message: string
  type: BroadcastType
  channels: BroadcastChannel[]
  audience: AudienceFilter
  status: BroadcastStatus
  scheduledAt: string
  startedAt: string | null
  completedAt: string | null
  /** Users queued so far; final once SENT. */
  recipientCount: number
  /** Each message is held until the hour that person is usually active. */
  smartTiming: boolean
  failureReason: string | null
  createdAt: string
  createdBy: { id: string; name: string }
}

export type DeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface BroadcastDelivery {
  channel: BroadcastChannel | 'SMS'
  status: DeliveryStatus
  count: number
}

export interface BroadcastDetail extends Broadcast {
  deliveries: BroadcastDelivery[]
}

export interface CreateBroadcastPayload {
  title: string
  message: string
  type: BroadcastType
  channels: BroadcastChannel[]
  audience: AudienceFilter
  /** ISO 8601. Omit to send immediately. */
  scheduledAt?: string
  /** Hold each person's message until the hour they are usually active. Not for SYSTEM announcements. */
  smartTiming?: boolean
}

/** A reusable message. `channel` is the channel it was written for, which a broadcast pre-selects. */
export interface NotificationTemplate {
  id: string
  name: string
  slug: string
  subject: string | null
  title: string
  body: string
  channel: BroadcastChannel | 'SMS'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationTemplatePayload {
  name: string
  title: string
  body: string
  subject?: string
  channel?: BroadcastChannel
  isActive?: boolean
}

export interface AudienceLocation {
  id: string
  name: string
  cities: { id: string; name: string }[]
}

export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
export type KycDocumentType = 'PAN' | 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENCE' | 'SELFIE'

/** A user's identity document as the review queue sees it. The number is masked in lists and full in the detail view. */
export interface KycDocument {
  id: string
  documentType: KycDocumentType
  documentNumber: string | null
  status: KycStatus
  rejectionReason: string | null
  hasFile: boolean
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  user: { id: string; name: string; email: string | null; phone: string | null }
}

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
  /** How it is (or was) paid: through the payment gateway, or by an admin who sent the money. */
  payoutMode?: PayoutMode | null
  /** The bank's reference (UTR) for the transfer, once paid. */
  payoutReference?: string | null
  paidAt?: string | null
  createdAt: string
  wallet?: { userId: string }
  bankAccount?: { bankName: string; accountNumber: string; accountHolderName: string; ifscCode?: string }
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

/** What raised a flag. Flags created before this was recorded have no type. */
export type FraudSignalType =
  | 'DUPLICATE_SUBMISSION'
  | 'MANIPULATED_IMAGE'
  | 'VPN_DETECTED'
  | 'MULTIPLE_ACCOUNTS'
  | 'REFERRAL_ABUSE'
  | 'RAPID_SUBMISSIONS'
  | 'SUSPICIOUS_DEVICE'
  | 'BLACKLISTED_IP'
  | 'AI_GENERATED'

/** How two accounts are tied together, strongest evidence first. */
export type AccountLinkKind = 'PAN' | 'BANK_ACCOUNT' | 'DEVICE' | 'IP'

export interface LinkedAccount {
  userId: string
  name: string
  status: string
  kinds: AccountLinkKind[]
}

/** PRIVATE: local address. ANONYMIZER: listed as VPN/proxy/Tor/datacenter. CLEAN: checked, not listed. UNKNOWN: cannot tell. */
export type IpVerdict = 'PRIVATE' | 'ANONYMIZER' | 'CLEAN' | 'UNKNOWN'

export interface RecentIp {
  ip: string
  verdict: IpVerdict
  sources: string[]
}

export interface AccountRisk {
  /** 0–100: the device's own risk plus points from linked accounts, capped. */
  score: number
  level: FraudRiskLevel
  deviceRisk: number
  linkPoints: number
  linkedAccounts: LinkedAccount[]
  recentIps: RecentIp[]
}

export interface FraudFlag {
  id: string
  submissionId: string
  userId: string
  riskLevel: FraudRiskLevel
  type?: FraudSignalType | null
  /** Evidence for the flag, e.g. which earlier submission a duplicate matches. Shape depends on `type`. */
  metadata?: Record<string, unknown> | null
  reason: string
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  user?: { id: string; firstName: string; lastName: string; email: string | null }
}

/** Result of clawing back a reward for confirmed fraud — see FraudReviewService.reverseReward on the backend. */
export interface ReversedReward {
  id: string
  status: 'REVERSED'
  amount: string
  reversedAmount: string
  shortfallAmount: string
  reversalReason: string
}

/**
 * A device flagged by basic risk signals (self-reported root/emulator + a
 * free header-based VPN heuristic) — see DeviceService.calculateRiskScore on
 * the backend. Detection/visibility only; nothing blocks on this yet.
 */
export interface RiskyDevice {
  id: string
  userId: string
  name: string | null
  platform: string
  os: string | null
  isActive: boolean
  lastSeenAt: string | null
  isRooted: boolean
  isEmulator: boolean
  vpnSuspected: boolean
  riskScore: number
  createdAt: string
  user?: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }
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
// GAMIFICATION TYPES
// ============================================================

export type BadgeCriteriaType = 'XP_THRESHOLD' | 'STREAK_THRESHOLD' | 'LEVEL_THRESHOLD' | 'REWARD_COUNT'

export interface Badge {
  id: string
  code: string
  name: string
  description: string
  iconUrl: string | null
  criteriaType: BadgeCriteriaType
  criteriaValue: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DailyRewardPrize {
  id: string
  label: string
  amount: number
  weight: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// MARKETPLACE TYPES
// ============================================================

export interface MarketplaceItem {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  category: string | null
  costAmount: number
  stock: number | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Redemption {
  id: string
  userId: string
  itemId: string
  costAmount: number
  redemptionCode: string
  createdAt: string
  item?: MarketplaceItem
}

// ============================================================
// SETTLEMENT TYPES
// ============================================================

export interface Invoice {
  id: string
  settlementId: string
  invoiceNumber: string
  taxableAmount: number
  gstRate: number
  gstAmount: number
}

export interface Settlement {
  id: string
  merchantId: string
  periodStart: string
  periodEnd: string
  totalToppedUp: number
  totalSpent: number
  commissionRate: number
  commissionAmount: number
  generatedAt: string
  invoice?: Invoice | null
  merchant?: { businessName: string }
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface AnalyticsEvent {
  id: string
  eventName: string
  eventCategory: string
  entityType: string | null
  entityId: string | null
  userId: string | null
  merchantId: string | null
  campaignId: string | null
  metadata: unknown
  createdAt: string
}

export interface DailyAnalytics {
  id: string
  date: string
  newUsers: number
  activeUsers: number
  campaignsCreated: number
  campaignsCompleted: number
  submissions: number
  rewardsPaid: number
  withdrawals: number
  revenue: number
  platformCommission: number
}

export interface MerchantAnalytics {
  id: string
  merchantId: string
  totalCampaigns: number
  totalParticipants: number
  totalBudget: number
  totalSpent: number
  averageCompletionRate: number
  totalRevenueGenerated: number
}

export interface UserAnalytics {
  id: string
  userId: string
  campaignsJoined: number
  campaignsCompleted: number
  rewardsEarned: number
  referrals: number
  withdrawals: number
  fraudFlags: number
}

// ============================================================
// SCHEDULED JOBS TYPES
// ============================================================

export type JobType =
  | 'CAMPAIGN_EXPIRY'
  | 'REWARD_PROCESSING'
  | 'ANALYTICS_AGGREGATION'
  | 'REPORT_GENERATION'
  | 'NOTIFICATION_DISPATCH'
  | 'FRAUD_SCAN'

export interface ScheduledJob {
  id: string
  jobName: string
  jobType: JobType
  cronExpression: string
  enabled: boolean
  lastRun: string | null
  nextRun: string | null
  retries: number
  configuration: unknown
  createdAt: string
  updatedAt: string
}

export interface JobExecutionLog {
  id: string
  jobId: string
  startedAt: string
  completedAt: string | null
  duration: number | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}

// ============================================================
// AI PROVIDER TYPES
// ============================================================

export interface AiModel {
  id: string
  providerId: string
  modelName: string
  version: string | null
  maxTokens: number
  temperature: number
  enabled: boolean
}

export interface AiPromptTemplate {
  id: string
  providerId: string
  name: string
  prompt: string
  version: string
  active: boolean
}

export interface AiProvider {
  id: string
  name: string
  provider: string
  apiEndpoint: string | null
  model: string | null
  enabled: boolean
  priority: number
  timeout: number
  configuration: unknown
  createdAt: string
  updatedAt: string
  models?: AiModel[]
  prompts?: AiPromptTemplate[]
}

export type AiUsageResponseStatus = 'SUCCESS' | 'FAILURE' | 'TIMEOUT'

export interface AiUsageLog {
  id: string
  providerId: string
  userId: string | null
  submissionId: string | null
  tokens: number
  latency: number
  cost: number
  responseStatus: AiUsageResponseStatus
  createdAt: string
}

// ============================================================
// PLATFORM CONFIGURATION TYPES
// ============================================================

export interface PlatformConfiguration {
  id: string
  platformName: string
  supportEmail: string | null
  supportPhone: string | null
  commissionPercentage: number
  minimumWithdrawal: number
  maximumWithdrawal: number
  /** The most one user can withdraw in a calendar day (India time). */
  dailyWithdrawalLimit: number
  /** The most one user can withdraw in a calendar month. Empty means no monthly limit. */
  monthlyWithdrawalLimit: number | null
  /** Hours a new or changed bank account waits before it can receive a withdrawal. 0 is off. */
  bankCoolingHours: number
  payoutMode: PayoutMode
  /** A bank-transfer top-up above this amount waits for a second admin. 0 credits every top-up straight away. */
  manualTopUpApprovalThreshold: number
  /** Tax kept back from user payouts, as a fraction (0.1 is 10%). 0 keeps none back. */
  tdsRate: number
  /** Tax is kept back once a user's payouts in a financial year go above this. */
  tdsAnnualThreshold: number
  /** The income tax section the deduction is made under. Needed before a rate can be set. */
  tdsSection: string | null
  /** While on, everyone except administrators is turned away. */
  maintenanceMode: boolean
  /** Shown during maintenance. Null uses the standard message. */
  maintenanceMessage: string | null
  /** The oldest app version allowed to use the server. Older apps are asked to update. */
  minimumAppVersion: string
  /** Where the update prompt sends people, such as the store page. */
  updateUrl: string | null
  appVersion: string
  apiVersion: string
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
