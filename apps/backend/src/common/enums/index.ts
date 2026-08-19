// =============================================================
// VIRAL KAR — Platform Enums
// All enums used across the backend application.
// =============================================================

// -------------------------------------------------------------
// ENVIRONMENT
// -------------------------------------------------------------
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

// -------------------------------------------------------------
// USER STATUS
// -------------------------------------------------------------
export enum UserStatus {
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
  Banned = 'BANNED',
  PendingVerification = 'PENDING_VERIFICATION',
  Deactivated = 'DEACTIVATED',
}

// -------------------------------------------------------------
// MERCHANT STATUS
// -------------------------------------------------------------
export enum MerchantStatus {
  PendingVerification = 'PENDING_VERIFICATION',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
  Rejected = 'REJECTED',
  Deactivated = 'DEACTIVATED',
}

// -------------------------------------------------------------
// KYC STATUS
// -------------------------------------------------------------
export enum KycStatus {
  NotSubmitted = 'NOT_SUBMITTED',
  Pending = 'PENDING',
  UnderReview = 'UNDER_REVIEW',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  RequiresResubmission = 'REQUIRES_RESUBMISSION',
}

// -------------------------------------------------------------
// CAMPAIGN STATUS
// -------------------------------------------------------------
export enum CampaignStatus {
  Draft = 'DRAFT',
  PendingReview = 'PENDING_REVIEW',
  Active = 'ACTIVE',
  Paused = 'PAUSED',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  Rejected = 'REJECTED',
  Archived = 'ARCHIVED',
}

// -------------------------------------------------------------
// TASK TYPE
// -------------------------------------------------------------
export enum TaskType {
  InstagramFollow = 'INSTAGRAM_FOLLOW',
  InstagramLike = 'INSTAGRAM_LIKE',
  InstagramComment = 'INSTAGRAM_COMMENT',
  InstagramStoryShare = 'INSTAGRAM_STORY_SHARE',
  FacebookShare = 'FACEBOOK_SHARE',
  FacebookLike = 'FACEBOOK_LIKE',
  GoogleReview = 'GOOGLE_REVIEW',
  PlayStoreReview = 'PLAY_STORE_REVIEW',
  AppInstall = 'APP_INSTALL',
  Referral = 'REFERRAL',
  Survey = 'SURVEY',
  WebsiteVisit = 'WEBSITE_VISIT',
  WatchVideo = 'WATCH_VIDEO',
  YoutubeSubscribe = 'YOUTUBE_SUBSCRIBE',
  TwitterFollow = 'TWITTER_FOLLOW',
}

// -------------------------------------------------------------
// SUBMISSION STATUS
// -------------------------------------------------------------
export enum SubmissionStatus {
  Pending = 'PENDING',
  AiProcessing = 'AI_PROCESSING',
  AiApproved = 'AI_APPROVED',
  AiRejected = 'AI_REJECTED',
  ManualReview = 'MANUAL_REVIEW',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Hold = 'HOLD',
  Expired = 'EXPIRED',
}

// -------------------------------------------------------------
// EVIDENCE TYPE
// -------------------------------------------------------------
export enum EvidenceType {
  Screenshot = 'SCREENSHOT',
  Video = 'VIDEO',
  Url = 'URL',
  Text = 'TEXT',
  Metadata = 'METADATA',
}

// -------------------------------------------------------------
// WALLET TRANSACTION TYPE
// -------------------------------------------------------------
export enum TransactionType {
  Credit = 'CREDIT',
  Debit = 'DEBIT',
  Refund = 'REFUND',
  Adjustment = 'ADJUSTMENT',
  Withdrawal = 'WITHDRAWAL',
  TopUp = 'TOP_UP',
  RewardCredit = 'REWARD_CREDIT',
  CampaignBudgetReserve = 'CAMPAIGN_BUDGET_RESERVE',
  CampaignBudgetRelease = 'CAMPAIGN_BUDGET_RELEASE',
}

// -------------------------------------------------------------
// WITHDRAWAL STATUS
// -------------------------------------------------------------
export enum WithdrawalStatus {
  Pending = 'PENDING',
  UnderReview = 'UNDER_REVIEW',
  Approved = 'APPROVED',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Rejected = 'REJECTED',
  Failed = 'FAILED',
}

// -------------------------------------------------------------
// NOTIFICATION TYPE
// -------------------------------------------------------------
export enum NotificationType {
  CampaignApproved = 'CAMPAIGN_APPROVED',
  CampaignRejected = 'CAMPAIGN_REJECTED',
  SubmissionApproved = 'SUBMISSION_APPROVED',
  SubmissionRejected = 'SUBMISSION_REJECTED',
  RewardCredited = 'REWARD_CREDITED',
  WithdrawalApproved = 'WITHDRAWAL_APPROVED',
  WithdrawalRejected = 'WITHDRAWAL_REJECTED',
  KycApproved = 'KYC_APPROVED',
  KycRejected = 'KYC_REJECTED',
  AccountWarning = 'ACCOUNT_WARNING',
  AccountSuspended = 'ACCOUNT_SUSPENDED',
  SystemAnnouncement = 'SYSTEM_ANNOUNCEMENT',
  NewCampaignAvailable = 'NEW_CAMPAIGN_AVAILABLE',
}

// -------------------------------------------------------------
// NOTIFICATION CHANNEL
// -------------------------------------------------------------
export enum NotificationChannel {
  Push = 'PUSH',
  Email = 'EMAIL',
  InApp = 'IN_APP',
  Sms = 'SMS',
}

// -------------------------------------------------------------
// SUPPORT TICKET STATUS
// -------------------------------------------------------------
export enum TicketStatus {
  Open = 'OPEN',
  InProgress = 'IN_PROGRESS',
  WaitingForUser = 'WAITING_FOR_USER',
  Resolved = 'RESOLVED',
  Closed = 'CLOSED',
}

// -------------------------------------------------------------
// SUPPORT TICKET PRIORITY
// -------------------------------------------------------------
export enum TicketPriority {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

// -------------------------------------------------------------
// ADMIN ROLE
// -------------------------------------------------------------
export enum AdminRole {
  SuperAdmin = 'SUPER_ADMIN',
  PlatformAdmin = 'PLATFORM_ADMIN',
  FinanceTeam = 'FINANCE_TEAM',
  SupportTeam = 'SUPPORT_TEAM',
  FraudTeam = 'FRAUD_TEAM',
  ContentModerator = 'CONTENT_MODERATOR',
  CampaignReviewer = 'CAMPAIGN_REVIEWER',
}

// -------------------------------------------------------------
// FRAUD FLAG TYPE
// -------------------------------------------------------------
export enum FraudFlagType {
  DuplicateSubmission = 'DUPLICATE_SUBMISSION',
  ManipulatedImage = 'MANIPULATED_IMAGE',
  VpnDetected = 'VPN_DETECTED',
  MultipleAccounts = 'MULTIPLE_ACCOUNTS',
  ReferralAbuse = 'REFERRAL_ABUSE',
  RapidSubmissions = 'RAPID_SUBMISSIONS',
  SuspiciousDevice = 'SUSPICIOUS_DEVICE',
  BlacklistedIp = 'BLACKLISTED_IP',
  AiGenerated = 'AI_GENERATED',
}

// -------------------------------------------------------------
// RISK LEVEL
// -------------------------------------------------------------
export enum RiskLevel {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Critical = 'CRITICAL',
}

// -------------------------------------------------------------
// AI VERDICT
// -------------------------------------------------------------
export enum AiVerdict {
  AutoApprove = 'AUTO_APPROVE',
  AutoReject = 'AUTO_REJECT',
  ManualReview = 'MANUAL_REVIEW',
  Hold = 'HOLD',
  Escalate = 'ESCALATE',
}

// -------------------------------------------------------------
// SORT ORDER
// -------------------------------------------------------------
export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

// -------------------------------------------------------------
// AUDIT ACTION
// -------------------------------------------------------------
export enum AuditAction {
  Create = 'CREATE',
  Update = 'UPDATE',
  Delete = 'DELETE',
  StatusChange = 'STATUS_CHANGE',
  Login = 'LOGIN',
  Logout = 'LOGOUT',
  Approve = 'APPROVE',
  Reject = 'REJECT',
  Suspend = 'SUSPEND',
  Ban = 'BAN',
  Restore = 'RESTORE',
  Export = 'EXPORT',
  ConfigChange = 'CONFIG_CHANGE',
}

// -------------------------------------------------------------
// SYSTEM ROLE
// -------------------------------------------------------------
export enum SystemRole {
  User = 'USER',
  Merchant = 'MERCHANT',
  Admin = 'ADMIN',
}

// -------------------------------------------------------------
// SYSTEM PERMISSION
// -------------------------------------------------------------
export enum SystemPermission {
  ManageUsers = 'users:manage',
  ManageMerchants = 'merchants:manage',
  ManageCampaigns = 'campaigns:manage',
  ViewAnalytics = 'analytics:view',
}
