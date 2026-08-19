export const TASK_ERRORS = {
  CAMPAIGN_NOT_EDITABLE: 'CAMPAIGN_NOT_EDITABLE',
  CAMPAIGN_NOT_ACTIVE: 'CAMPAIGN_NOT_ACTIVE',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  PARTICIPANT_NOT_STARTED: 'PARTICIPANT_NOT_STARTED',
  PARTICIPANT_DISQUALIFIED: 'PARTICIPANT_DISQUALIFIED',
  SUBMISSION_ALREADY_PENDING: 'SUBMISSION_ALREADY_PENDING',
  EVIDENCE_REQUIRED: 'EVIDENCE_REQUIRED',
} as const;

export const TASK_EVENTS = {
  CREATED: 'task.created',
  UPDATED: 'task.updated',
  DELETED: 'task.deleted',
  STARTED: 'task.started',
  SUBMITTED: 'task.submitted',
  SUBMISSION_APPROVED: 'task.submission.approved',
  SUBMISSION_REJECTED: 'task.submission.rejected',
} as const;

/** Submission statuses a reviewer can still act on. */
export const REVIEWABLE_SUBMISSION_STATUSES = ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL'];

export const SUBMISSION_STORAGE = {
  FOLDER: 'submissions',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'],
  MAX_FILE_SIZE: 20 * 1024 * 1024,
} as const;

/**
 * Submission statuses that block a new submission attempt on the same task.
 * A REJECTED submission is the only one that allows resubmission.
 */
export const BLOCKING_SUBMISSION_STATUSES = ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL', 'APPROVED'];
