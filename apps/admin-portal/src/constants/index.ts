export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  MERCHANTS: '/merchants',
  CAMPAIGNS: '/campaigns',
  WITHDRAWALS: '/withdrawals',
  FRAUD: '/fraud',
  CMS_PAGES: '/cms/pages',
  FAQS: '/cms/faqs',
  SETTINGS: '/settings',
  FEATURE_FLAGS: '/feature-flags',
  AUDIT_LOGS: '/audit-logs',
  SUPPORT_TICKETS: '/support/tickets',
  PROFILE: '/profile',
} as const

export const QUERY_KEYS = {
  ME: ['me'],
  USERS: ['users'],
  USER_DETAIL: ['users', 'detail'],
  MERCHANTS: ['merchants'],
  MERCHANT_DETAIL: ['merchants', 'detail'],
  CAMPAIGN_QUEUE: ['campaign-queue'],
  WITHDRAWAL_QUEUE: ['withdrawal-queue'],
  FRAUD_FLAGS: ['fraud-flags'],
  CMS_PAGES: ['cms-pages'],
  FAQS: ['faqs'],
  SETTINGS: ['settings'],
  FEATURE_FLAGS: ['feature-flags'],
  AUDIT_LOGS: ['audit-logs'],
  SUPPORT_TICKETS: ['support-tickets'],
} as const

export const ITEMS_PER_PAGE = 20

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  BANNED: 'Banned',
  PENDING_VERIFICATION: 'Pending Verification',
  DEACTIVATED: 'Deactivated',
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

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
}

export const FRAUD_RISK_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_USER: 'Waiting on Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

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
