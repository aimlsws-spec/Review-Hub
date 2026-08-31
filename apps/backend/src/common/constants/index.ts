// =============================================================
// VIRAL KAR — Platform Constants
// =============================================================

// -------------------------------------------------------------
// API
// -------------------------------------------------------------
export const API_VERSION = 'v1';
export const API_PREFIX = 'api';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

// -------------------------------------------------------------
// PAGINATION
// -------------------------------------------------------------
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  maxLimit: MAX_PAGE_SIZE,
} as const;

// -------------------------------------------------------------
// JWT
// -------------------------------------------------------------
export const JWT_ACCESS_EXPIRES = '15m';
export const JWT_REFRESH_EXPIRES = '7d';

// -------------------------------------------------------------
// OTP
// -------------------------------------------------------------
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

// -------------------------------------------------------------
// FILE UPLOAD
// -------------------------------------------------------------
export const FILE_UPLOAD = {
  maxSizeMb: 10,
  maxSizeBytes: 10 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: ['application/pdf'],
  allowedVideoTypes: ['video/mp4', 'video/quicktime'],
  allowedAllTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
  ],
} as const;

// -------------------------------------------------------------
// WALLET
// -------------------------------------------------------------
export const WALLET = {
  minWithdrawalAmount: 100,
  maxWithdrawalAmount: 50000,
  minTopUpAmount: 500,
  maxTopUpAmount: 500000,
  decimalPlaces: 2,
} as const;

// -------------------------------------------------------------
// CAMPAIGN
// -------------------------------------------------------------
export const CAMPAIGN = {
  minBudget: 1000,
  maxBudget: 10000000,
  minRewardPerTask: 1,
  maxRewardPerTask: 10000,
  maxTasksPerCampaign: 100000,
  maxAssetsPerCampaign: 10,
} as const;

// -------------------------------------------------------------
// RATE LIMITING
// -------------------------------------------------------------
export const RATE_LIMIT = {
  global: { ttl: 60000, limit: 100 },
  auth: { ttl: 60000, limit: 10 },
  otp: { ttl: 3600000, limit: 3 },
  upload: { ttl: 60000, limit: 20 },
} as const;

// -------------------------------------------------------------
// CACHE TTL (seconds)
// -------------------------------------------------------------
export const CACHE_TTL = {
  short: 60,
  medium: 300,
  long: 3600,
  day: 86400,
  userProfile: 300,
  merchantProfile: 300,
  campaignList: 60,
  systemSettings: 3600,
} as const;

// -------------------------------------------------------------
// REDIS KEY PREFIXES
// -------------------------------------------------------------
export const REDIS_KEYS = {
  otp: (phone: string) => `otp:${phone}`,
  otpAttempts: (phone: string) => `otp:attempts:${phone}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  userSession: (userId: string) => `session:${userId}`,
  rateLimitOtp: (phone: string) => `rl:otp:${phone}`,
  blacklistedToken: (jti: string) => `blacklist:${jti}`,
  systemSettings: () => `settings:system`,
} as const;

// -------------------------------------------------------------
// INJECTION TOKENS
// -------------------------------------------------------------
export const INJECTION_TOKENS = {
  PRISMA_SERVICE: 'PRISMA_SERVICE',
  LOGGER: 'LOGGER',
  REDIS_CLIENT: 'REDIS_CLIENT',
  CONFIG_SERVICE: 'CONFIG_SERVICE',
} as const;

// -------------------------------------------------------------
// SWAGGER TAGS
// -------------------------------------------------------------
export const SWAGGER_TAGS = {
  AUTH: 'Authentication',
  USERS: 'Users',
  MERCHANTS: 'Merchants',
  CAMPAIGNS: 'Campaigns',
  TASKS: 'Tasks',
  SUBMISSIONS: 'Submissions',
  WALLET: 'Wallet',
  REWARDS: 'Rewards',
  WITHDRAWALS: 'Withdrawals',
  REFERRALS: 'Referrals',
  NOTIFICATIONS: 'Notifications',
  SUPPORT: 'Support',
  USER_KYC: 'User KYC',
  ANALYTICS: 'Analytics',
  REPORTS: 'Reports',
  FRAUD: 'Fraud',
  ADMIN: 'Admin',
  SETTINGS: 'Settings',
  AUDIT: 'Audit Logs',
  HEALTH: 'Health',
} as const;

// -------------------------------------------------------------
// ERROR CODES
// -------------------------------------------------------------
export const ERROR_CODES = {
  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_RESEND_COOLDOWN: 'OTP_RESEND_COOLDOWN',

  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_BANNED: 'USER_BANNED',

  // Merchant
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
  MERCHANT_NOT_VERIFIED: 'MERCHANT_NOT_VERIFIED',
  KYC_ALREADY_SUBMITTED: 'KYC_ALREADY_SUBMITTED',

  // Campaign
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_INVALID_STATUS_TRANSITION: 'CAMPAIGN_INVALID_STATUS_TRANSITION',
  CAMPAIGN_INSUFFICIENT_BUDGET: 'CAMPAIGN_INSUFFICIENT_BUDGET',

  // Wallet
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',

  // File
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
} as const;
