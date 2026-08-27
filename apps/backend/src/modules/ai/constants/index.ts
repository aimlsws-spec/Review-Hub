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
