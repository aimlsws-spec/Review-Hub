export enum InsightCode {
  NOT_ENOUGH_DATA = 'NOT_ENOUGH_DATA',
  NO_LIVE_CAMPAIGN = 'NO_LIVE_CAMPAIGN',
  LOW_COMPLETION = 'LOW_COMPLETION',
  NOBODY_JOINED = 'NOBODY_JOINED',
  HIGH_REJECTION = 'HIGH_REJECTION',
  BUDGET_RUNNING_OUT = 'BUDGET_RUNNING_OUT',
  ENDING_WITH_BUDGET_LEFT = 'ENDING_WITH_BUDGET_LEFT',
  CHEAPEST_TYPE = 'CHEAPEST_TYPE',
}

export enum InsightSeverity {
  /** Something is going wrong now. */
  WARNING = 'WARNING',
  /** Something could be done better. */
  OPPORTUNITY = 'OPPORTUNITY',
  INFO = 'INFO',
}

/** Warnings first, then things to improve, then plain information. */
export const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  [InsightSeverity.WARNING]: 0,
  [InsightSeverity.OPPORTUNITY]: 1,
  [InsightSeverity.INFO]: 2,
};

export const INSIGHTS = {
  /** Campaigns from this many days back are looked at, plus any that are live now. */
  windowDays: 90,
  maxCampaigns: 100,
  maxSuggestions: 8,

  /** A campaign is flagged when at least this many joined but fewer than this share finished. */
  lowCompletionMinJoins: 20,
  lowCompletionRate: 0.25,

  /** A live campaign nobody joined is flagged after it has been running this many days. */
  nobodyJoinedAfterDays: 3,

  /** Submissions are judged only once this many have been reviewed. */
  rejectionMinReviewed: 10,
  highRejectionRate: 0.4,
  approvalMinReviewed: 10,

  /** A live campaign is flagged when it has used this share of its budget with more than this many days left. */
  budgetRunningOutShare: 0.8,
  budgetRunningOutMinDaysLeft: 2,

  /** A campaign ending within this many days with less than this share of its budget used is flagged. */
  endingSoonDays: 3,
  endingLowUseShare: 0.3,

  /** A type is only compared once it has this many completed tasks. */
  cheapestTypeMinCompletions: 10,
  /** ...and only mentioned when the dearest type costs at least this many times the cheapest. */
  cheapestTypeMinRatio: 1.5,
} as const;

export const INSIGHTS_NOTE =
  'These figures show what you paid for each completed task. They do not include what those tasks earned you, because the platform cannot see your sales.';

/** Statuses of a campaign that has actually run, as opposed to a draft or one that was never approved. */
export const RAN_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED'] as const;
