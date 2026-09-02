/** Thresholds an AI verification result must clear to be auto-applied instead of escalated to a human reviewer. */
export const AI_VERIFICATION_THRESHOLDS = {
  MIN_CONFIDENCE: 0.85,
  MAX_FRAUD_SCORE: 0.3,
} as const;

/** Task types a written-text suggestion actually makes sense for. */
export const TEXT_ASSIST_SUPPORTED_TASK_TYPES = [
  'GOOGLE_REVIEW',
  'PLAY_STORE_REVIEW',
  'INSTAGRAM_STORY_SHARE',
  'INSTAGRAM_COMMENT',
  'TEXT',
] as const;

/** The narrower set the *guided* review assistant applies to — genuine reviews only, not general text/captions. */
export const REVIEW_DRAFT_SUPPORTED_TASK_TYPES = ['GOOGLE_REVIEW', 'PLAY_STORE_REVIEW'] as const;

/**
 * The guided assistants generate several outputs per call (4 review drafts,
 * 5 captions) instead of suggestText's one, and local CPU-only LLM inference
 * is genuinely slow — measured ~20-55s locally depending on model size. The
 * default ai.timeoutMs (20s) is tuned for the single-suggestion case and
 * would time out these calls far too often.
 */
export const AI_ASSIST_GENEROUS_TIMEOUT_MS = 60000;
