/** What an AI call was for. Stored in AIUsageLog.feature. */
export const AI_CALL_FEATURES = {
  TEXT_SUGGESTION: 'TEXT_SUGGESTION',
  REVIEW_DRAFTS: 'REVIEW_DRAFTS',
  CAPTIONS: 'CAPTIONS',
  KYC_OCR: 'KYC_OCR',
  SUBMISSION_VERIFICATION: 'SUBMISSION_VERIFICATION',
  ADMIN_SUMMARY: 'ADMIN_SUMMARY',
} as const;

export type AiCallFeature = (typeof AI_CALL_FEATURES)[keyof typeof AI_CALL_FEATURES];

/** How an AI call ended, as stored (AIResponseStatus). */
export type AiCallStatus = 'SUCCESS' | 'FALLBACK' | 'FAILED' | 'TIMEOUT';

/** Logs older than this are deleted by the ai-call-log-cleanup job. */
export const AI_CALL_LOG_RETENTION_DAYS = 90;

/** The AI service does not report token usage, so it is estimated from text size: about four characters a token. */
export const CHARACTERS_PER_TOKEN = 4;

/** Most recent calls per feature used to work out the 95th-percentile latency. */
export const LATENCY_SAMPLE_SIZE = 5000;
