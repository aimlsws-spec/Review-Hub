import { SupportCategory } from '@prisma/client';

/** What the assistant understood the person to be asking for. */
export enum ChatIntent {
  GREETING = 'GREETING',
  THANKS = 'THANKS',
  /** The person asked for a human. */
  HUMAN_REQUEST = 'HUMAN_REQUEST',
  /** About something on their own account (a stuck payout, money taken). The assistant cannot look at accounts. */
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  QUESTION = 'QUESTION',
}

/** How sure the assistant is that the answer it found matches the question. */
export enum ChatConfidence {
  HIGH = 'HIGH',
  LOW = 'LOW',
  NONE = 'NONE',
}

export enum ChatRole {
  USER = 'USER',
  BOT = 'BOT',
}

export enum KnowledgeSourceKind {
  FAQ = 'FAQ',
  PAGE = 'PAGE',
}

/** A message the assistant can send on its own; none of these state anything about accounts or money. */
export const CHATBOT_REPLIES = {
  greeting: 'Hi! I can answer questions about how Viral Kar works. What would you like to know?',
  thanks: 'You are welcome! Ask me anything else, or tap "Talk to a person" if you need more help.',
  humanRequest: 'Sure, I can pass this to our support team. Tap "Talk to a person" and they will reply to you.',
  accountIssue:
    'I cannot see your account, so I cannot check this myself. Our support team can look into it. Tap "Talk to a person" and they will reply to you.',
  lowConfidence: 'I am not completely sure, but this might help:',
  noAnswer:
    'I could not find an answer to that. You can try asking in different words, or tap "Talk to a person" and our support team will reply to you.',
  unavailable: 'I do not have any help articles to search yet. Tap "Talk to a person" and our support team will reply to you.',
  ticketSubject: 'Help requested from the chat assistant',
} as const;

/** Rules are checked in this order; the first that matches decides the intent. */
export const INTENT_RULES: { intent: ChatIntent; pattern: RegExp }[] = [
  {
    intent: ChatIntent.HUMAN_REQUEST,
    pattern:
      /\b(human|real person|live agent|an agent|representative|talk to (a |an )?(person|someone|support|agent)|speak to (a |an )?(person|someone|support|agent)|customer (care|support|service)|call me)\b/i,
  },
  {
    intent: ChatIntent.ACCOUNT_ISSUE,
    pattern:
      /\b(stuck|not received|not credited|didn'?t (receive|get)|haven'?t (received|got)|deducted|debited|charged twice|double charged|failed|missing|wrong amount|blocked|suspended|banned|hacked|fraud|scam|cheated|refund|chargeback|complain\w*|dispute\w*)\b/i,
  },
  { intent: ChatIntent.GREETING, pattern: /^\s*(hi|hii+|hello|hey|hola|namaste|good (morning|afternoon|evening))\b[\s!.,?]*$/i },
  { intent: ChatIntent.THANKS, pattern: /^\s*(ok(ay)?\s*)?(thanks|thank you|thx|thankyou|shukriya|dhanyavad)\b[\s!.,]*$/i },
];

/** First matching rule wins, so the more specific topics come first. */
export const CATEGORY_RULES: { category: SupportCategory; pattern: RegExp }[] = [
  { category: SupportCategory.WITHDRAWAL, pattern: /\b(withdraw\w*|payout\w*|cash ?out|upi|bank account|ifsc)\b/i },
  { category: SupportCategory.PAYMENT, pattern: /\b(payment\w*|paid|refund\w*|deducted|debited|wallet|razorpay|transaction\w*|invoice\w*)\b/i },
  { category: SupportCategory.REWARD, pattern: /\b(reward\w*|points?|coupon\w*|cashback|redeem\w*)\b/i },
  { category: SupportCategory.CAMPAIGN, pattern: /\b(campaign\w*|task\w*|submission\w*|submit\w*|proof|screenshot\w*)\b/i },
  { category: SupportCategory.ACCOUNT, pattern: /\b(login|log in|password|otp|kyc|verif\w*|account|profile|phone number|email|pan|aadhaar)\b/i },
  { category: SupportCategory.BUG, pattern: /\b(crash\w*|bug|error|not working|freez\w*|glitch\w*|app (closes|stops))\b/i },
];

/** Words that make a handed-over conversation urgent: money or safety. */
export const URGENT_PATTERN = /\b(fraud|scam|hacked|cheated|deducted|debited|charged twice|double charged|stolen)\b/i;

/** Words that carry no meaning for matching a question to an answer. */
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'so', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'about', 'as',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'done', 'have', 'has', 'had', 'will', 'would', 'can',
  'could', 'should', 'may', 'might', 'i', 'me', 'my', 'mine', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'its', 'they',
  'them', 'their', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'how', 'why', 'when', 'where', 'get',
  'got', 'please', 'pls', 'help', 'need', 'want', 'tell', 'know', 'there', 'here', 'any', 'some', 'not', 'no', 'yes', 'ok',
  'okay', 'hi', 'hello', 'hey',
]);

/** Different words for the same thing, so a question worded another way still finds the answer. */
export const SYNONYMS: Record<string, string> = {
  withdrawal: 'withdraw',
  withdrawals: 'withdraw',
  withdrawing: 'withdraw',
  withdrew: 'withdraw',
  payout: 'withdraw',
  payouts: 'withdraw',
  cashout: 'withdraw',
  verification: 'verify',
  verified: 'verify',
  verifying: 'verify',
  registration: 'register',
  registered: 'register',
  signup: 'register',
  earnings: 'earn',
  earned: 'earn',
  earning: 'earn',
  rewards: 'reward',
  rewarded: 'reward',
  passcode: 'password',
  pwd: 'password',
};

export const KNOWLEDGE = {
  /** The index is rebuilt at most this often, so a changed FAQ shows up in answers within this time. */
  cacheTtlMs: 5 * 60 * 1000,
  maxFaqs: 500,
  maxPages: 100,
  /** A page is split into pieces about this long so an answer is one part of it, not the whole page. */
  chunkChars: 500,
  /** An answer is cut to about this length, at the end of a sentence where possible. */
  maxAnswerChars: 700,
  maxSources: 3,
  /** Share of the meaningful words in the question that the best answer must contain. */
  highCoverage: 0.6,
  lowCoverage: 0.34,
} as const;

export const CHATBOT_LIMITS = {
  messageMaxLength: 500,
  transcriptMaxMessages: 20,
  transcriptMessageMaxLength: 1000,
  subjectMaxLength: 100,
} as const;
