export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  TEAM: '/team',
  REVIEWS: '/reviews',
  CUSTOMERS: '/customers',
  CAMPAIGNS: '/campaigns',
  REWARDS: '/rewards',
  COUPONS: '/coupons',
  WALLET: '/wallet',
  DOCUMENTS: '/documents',
  SETTINGS: '/settings',
  SUPPORT: '/support',
} as const

export const QUERY_KEYS = {
  ME: ['me'],
  MERCHANT: ['merchant'],
  MERCHANT_PROFILE: ['merchant', 'profile'],
  TEAM: ['team'],
  INVITATIONS: ['invitations'],
  WALLET: ['wallet'],
  TRANSACTIONS: ['transactions'],
  DOCUMENTS: ['documents'],
  BANK_ACCOUNTS: ['bank-accounts'],
  CAMPAIGNS: ['campaigns'],
  MERCHANT_REWARDS: ['merchant-rewards'],
  SUPPORT_TICKETS: ['support-tickets'],
  REVIEWS: ['reviews'],
  REVIEW_STATS: ['reviews', 'stats'],
  CUSTOMERS: ['customers'],
  CUSTOMER_STATS: ['customers', 'stats'],
  DASHBOARD: ['dashboard'],
  NOTIFICATIONS: ['notifications'],
} as const

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: 'Account',
  CAMPAIGN: 'Campaign',
  PAYMENT: 'Payment',
  WITHDRAWAL: 'Withdrawal',
  REWARD: 'Reward',
  BUG: 'Bug',
  GENERAL: 'General',
}

export const SUPPORT_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_USER: 'Waiting on You',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export const TEAM_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PAN: 'PAN Card',
  GST: 'GST Certificate',
  BUSINESS_REGISTRATION: 'Business Registration',
  ADDRESS_PROOF: 'Address Proof',
  CANCELLED_CHEQUE: 'Cancelled Cheque',
  BANK_PROOF: 'Bank Proof',
  IDENTITY_PROOF: 'Identity Proof',
}

export const REWARD_TYPE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  POINTS: 'Points',
  COUPON: 'Coupon',
  GIFT_CARD: 'Gift Card',
  PRODUCT: 'Product',
  DISCOUNT: 'Discount',
}

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  CHANGES_REQUESTED: 'Changes Requested',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
}

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  SOCIAL_SHARE: 'Social Share',
  SOCIAL_FOLLOW: 'Social Follow',
  REVIEW: 'Review',
  REFERRAL: 'Referral',
  APP_INSTALL: 'App Install',
  VIDEO_WATCH: 'Video Watch',
  WEBSITE_VISIT: 'Website Visit',
  SURVEY: 'Survey',
  CUSTOM: 'Custom',
}

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  AI_PROCESSING: 'AI Processing',
  PENDING_MANUAL: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RESUBMITTED: 'Resubmitted',
  EXPIRED: 'Expired',
}

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  CREDIT: 'Credit',
  DEBIT: 'Debit',
  HOLD: 'Hold',
  RELEASE: 'Release',
  REFUND: 'Refund',
  WITHDRAWAL: 'Withdrawal',
  BONUS: 'Bonus',
  REFERRAL: 'Referral',
}

export const ITEMS_PER_PAGE = 10
