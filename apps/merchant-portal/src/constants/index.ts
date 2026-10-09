import type { CampaignGoal, CampaignType, TaskCompletionLimit, TaskProofType, TaskType, TaskVerificationType } from '@/types'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

/**
 * Whether to show the "Simulate payment" button, which credits a wallet with no real payment.
 * The backend only answers it while its mock gateway is active (PAYMENT_PROVIDER=mock) and returns
 * 404 otherwise, so the button is opt-in: set VITE_ENABLE_PAYMENT_SIMULATION=true only alongside a
 * mock backend. It used to show in every dev build, where against Razorpay test keys it just failed.
 */
export const PAYMENT_SIMULATION_ENABLED = import.meta.env.VITE_ENABLE_PAYMENT_SIMULATION === 'true'

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
  SUBMISSIONS: '/submissions',
  REWARDS: '/rewards',
  ANALYTICS: '/analytics',
  WALLET: '/wallet',
  REFUNDS: '/refunds',
  FINANCE: '/finance',
  DOCUMENTS: '/documents',
  SETTINGS: '/settings',
  SUPPORT: '/support',
  WEBHOOKS: '/webhooks',
  SUBSCRIPTION: '/plan',
} as const

/** The legal documents a person accepts (backend: POLICY_DOCUMENTS in auth/constants), and the page holding each. */
export const POLICY_DOCUMENTS = [
  { slug: 'terms-and-conditions', title: 'Terms & Conditions' },
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'reward-policy', title: 'Reward Policy' },
] as const

export const QUERY_KEYS = {
  ME: ['me'],
  MERCHANT: ['merchant'],
  MERCHANT_PROFILE: ['merchant', 'profile'],
  TEAM: ['team'],
  INVITATIONS: ['invitations'],
  WALLET: ['wallet'],
  TRANSACTIONS: ['transactions'],
  AUTO_RECHARGE: ['wallet', 'auto-recharge'],
  REFUNDS: ['refunds'],
  SETTLEMENTS: ['settlements'],
  INVOICES: ['invoices'],
  INVOICE_NOTES: ['invoice-notes'],
  DOCUMENTS: ['documents'],
  BANK_ACCOUNTS: ['bank-accounts'],
  CAMPAIGNS: ['campaigns'],
  SUBMISSIONS: ['submissions'],
  MERCHANT_REWARDS: ['merchant-rewards'],
  SUPPORT_TICKETS: ['support-tickets'],
  REVIEWS: ['reviews'],
  REVIEW_STATS: ['reviews', 'stats'],
  CUSTOMERS: ['customers'],
  CUSTOMER_STATS: ['customers', 'stats'],
  DASHBOARD: ['dashboard'],
  ANALYTICS: ['analytics'],
  NOTIFICATIONS: ['notifications'],
  WEBHOOKS: ['webhooks'],
  SUBSCRIPTION: ['subscription'],
  SUGGESTIONS: ['suggestions'],
  POLICIES: ['policies'],
  CONTENT_PAGE: ['content-page'],
  WEBHOOK_DELIVERIES: ['webhook-deliveries'],
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

export const INVOICE_NOTE_TYPE_LABELS: Record<string, string> = {
  CREDIT: 'Credit note',
  DEBIT: 'Debit note',
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

/**
 * What a merchant can create today. The backend enforces the same lists (campaign/constants/enabled-types.constants.ts);
 * the other types stay labelled below so campaigns and tasks made earlier still show their names.
 */
export const ENABLED_CAMPAIGN_TYPES: CampaignType[] = ['REVIEW', 'SOCIAL_SHARE', 'SOCIAL_FOLLOW']

export const ENABLED_TASK_TYPES: TaskType[] = [
  'GOOGLE_REVIEW',
  'PLAY_STORE_REVIEW',
  'SCREENSHOT',
  'URL',
  'VIDEO',
  'INSTAGRAM_FOLLOW',
  'INSTAGRAM_LIKE',
  'INSTAGRAM_COMMENT',
  'INSTAGRAM_STORY_SHARE',
  'FACEBOOK_SHARE',
  'FACEBOOK_LIKE',
  'YOUTUBE_SUBSCRIBE',
  'TWITTER_FOLLOW',
  'QR_SCAN',
  'LOCATION_CHECKIN',
]

/** Proof that shows the task was done. A written answer is not offered: anyone can type one without doing the task. */
export const ENABLED_PROOF_TYPES: TaskProofType[] = ['SCREENSHOT', 'VIDEO', 'URL']

/** The builder's goals that lead to a campaign type on offer (reviews, followers, shares). */
export const ENABLED_CAMPAIGN_GOALS: CampaignGoal[] = ['MORE_REVIEWS', 'MORE_FOLLOWERS', 'SPREAD_THE_WORD']

export const CAMPAIGN_GOAL_LABELS: Record<CampaignGoal, string> = {
  MORE_REVIEWS: 'Get more reviews',
  MORE_FOLLOWERS: 'Get more followers',
  SPREAD_THE_WORD: 'Get people to share about us',
  APP_INSTALLS: 'Get more app installs',
  WEBSITE_TRAFFIC: 'Get more website visits',
  CUSTOMER_FEEDBACK: 'Collect customer feedback',
  VIDEO_VIEWS: 'Get more video views',
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

/** What a participant is asked to do. Listed in the order the task editor offers them. */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  SCREENSHOT: 'Upload a screenshot',
  TEXT: 'Write an answer',
  URL: 'Share a link',
  VIDEO: 'Upload a video',
  GOOGLE_REVIEW: 'Google review',
  INSTAGRAM_FOLLOW: 'Instagram follow',
  INSTAGRAM_LIKE: 'Instagram like',
  INSTAGRAM_COMMENT: 'Instagram comment',
  INSTAGRAM_STORY_SHARE: 'Instagram story share',
  FACEBOOK_SHARE: 'Facebook share',
  FACEBOOK_LIKE: 'Facebook like',
  YOUTUBE_SUBSCRIBE: 'YouTube subscribe',
  TWITTER_FOLLOW: 'X (Twitter) follow',
  WATCH_VIDEO: 'Watch a video',
  WEBSITE_VISIT: 'Visit a website',
  APP_INSTALL: 'Install an app',
  PLAY_STORE_REVIEW: 'Play Store review',
  SURVEY: 'Answer a survey',
  REFERRAL: 'Refer a friend',
  QR_SCAN: 'Scan a QR code in store',
  LOCATION_CHECKIN: 'Check in at a location',
  FILE_UPLOAD: 'Upload a file',
  CUSTOM: 'Other',
}

/** Proof a participant can send for an ordinary task. QR and location tasks bring their own. */
export const TASK_PROOF_LABELS: Partial<Record<TaskProofType, string>> = {
  SCREENSHOT: 'Screenshot',
  VIDEO: 'Video',
  URL: 'Link',
  TEXT: 'Written answer',
}

/**
 * Who checks a task's proof. Either way a person (you) approves every reward before anything is paid: the AI only
 * advises. "The AI pays automatically" is no longer offered; a task saved with it now works as "AI checks, then I
 * confirm" (see verificationLabel).
 */
export const TASK_VERIFICATION_LABELS: Partial<Record<TaskVerificationType, string>> = {
  MANUAL: 'I review each one',
  HYBRID: 'AI checks, then I confirm',
}

/** The label for a task's checking choice, reading an older "AI" task as what it now does. */
export function verificationLabel(verificationType: TaskVerificationType): string | undefined {
  return TASK_VERIFICATION_LABELS[verificationType === 'AI' ? 'HYBRID' : verificationType]
}

/** What each choice means in practice, shown under the field. */
export const TASK_VERIFICATION_HINTS: Partial<Record<TaskVerificationType, string>> = {
  MANUAL: 'Every submission waits for you to approve or reject it. Nothing is paid until you approve.',
  HYBRID: 'The AI first looks for re-used, blank or unreadable screenshots and links to the wrong site, and notes what it finds. You still approve or reject every submission.',
}

export const TASK_COMPLETION_LIMIT_LABELS: Record<TaskCompletionLimit, string> = {
  ONCE: 'Once per person',
  DAILY: 'Once a day',
  WEEKLY: 'Once a week',
  MONTHLY: 'Once a month',
}

/** Task types checked by a rule (code match, distance) rather than by a person or AI. */
export const SYSTEM_VERIFIED_TASK_TYPES: TaskType[] = ['QR_SCAN', 'LOCATION_CHECKIN']

/** Where a task done on another site happens, and how to find the link to give participants. */
export interface TaskLinkSite {
  site: string
  hosts: string[]
  placeholder: string
  hint: string
}

const GOOGLE_HOSTS = ['google.com', 'google.co.in', 'g.page', 'goo.gl']
const INSTAGRAM_HOSTS = ['instagram.com', 'instagr.am']
const FACEBOOK_HOSTS = ['facebook.com', 'fb.com', 'fb.me', 'fb.watch']
const INSTAGRAM_POST_HINT = 'Open the post in Instagram, tap ⋯ then "Copy link", and paste it here.'

/**
 * Task types done on another site need a link to it: participants open it from the app. Mirrors the backend's
 * task-link.ts, which refuses a link to any other site.
 */
export const TASK_LINK_SITES: Partial<Record<TaskType, TaskLinkSite>> = {
  GOOGLE_REVIEW: {
    site: 'Google',
    hosts: GOOGLE_HOSTS,
    placeholder: 'https://g.page/r/your-business/review',
    hint: 'Your Google review link: in Google Maps or your Business Profile, choose "Ask for reviews" (or Share) and copy the link.',
  },
  PLAY_STORE_REVIEW: {
    site: 'Google Play',
    hosts: ['play.google.com'],
    placeholder: 'https://play.google.com/store/apps/details?id=…',
    hint: 'Your app\'s page on Google Play.',
  },
  INSTAGRAM_FOLLOW: {
    site: 'Instagram',
    hosts: INSTAGRAM_HOSTS,
    placeholder: 'https://www.instagram.com/yourbusiness/',
    hint: 'Your Instagram profile: the account participants follow.',
  },
  INSTAGRAM_LIKE: { site: 'Instagram', hosts: INSTAGRAM_HOSTS, placeholder: 'https://www.instagram.com/p/…', hint: INSTAGRAM_POST_HINT },
  INSTAGRAM_COMMENT: { site: 'Instagram', hosts: INSTAGRAM_HOSTS, placeholder: 'https://www.instagram.com/p/…', hint: INSTAGRAM_POST_HINT },
  INSTAGRAM_STORY_SHARE: {
    site: 'Instagram',
    hosts: INSTAGRAM_HOSTS,
    placeholder: 'https://www.instagram.com/p/…',
    hint: 'The post participants share to their story, or your profile if they post their own photo and tag you.',
  },
  FACEBOOK_SHARE: {
    site: 'Facebook',
    hosts: FACEBOOK_HOSTS,
    placeholder: 'https://www.facebook.com/yourbusiness/posts/…',
    hint: 'The post participants share. Open it on Facebook, tap Share then "Copy link".',
  },
  FACEBOOK_LIKE: {
    site: 'Facebook',
    hosts: FACEBOOK_HOSTS,
    placeholder: 'https://www.facebook.com/yourbusiness',
    hint: 'Your Facebook page: the page participants like.',
  },
  YOUTUBE_SUBSCRIBE: {
    site: 'YouTube',
    hosts: ['youtube.com', 'youtu.be'],
    placeholder: 'https://www.youtube.com/@yourchannel',
    hint: 'Your YouTube channel.',
  },
  TWITTER_FOLLOW: {
    site: 'X (Twitter)',
    hosts: ['x.com', 'twitter.com'],
    placeholder: 'https://x.com/yourbusiness',
    hint: 'Your X (Twitter) profile.',
  },
}

/** What is wrong with a task's link, or null when it is fine (same rules as the backend). */
export function taskLinkError(taskType: TaskType, link: string): string | null {
  const rule = TASK_LINK_SITES[taskType]
  const value = link.trim()
  if (!value) return rule ? `Add the link to ${rule.site}` : null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'Paste the full address, starting with https://'
  }
  if (url.protocol !== 'https:') return 'The link must start with https://'
  const host = url.hostname.toLowerCase()
  if (rule && !rule.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return `This must be a link to ${rule.site}`
  }
  return null
}

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'AI checking',
  AI_PROCESSING: 'AI checking',
  PENDING_MANUAL: 'Waiting for you',
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
