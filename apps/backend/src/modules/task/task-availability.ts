import { TaskCompletionLimit } from '@prisma/client';

import { formatIstDateTime, getIstDayBoundaries, getIstMonthBoundaries, getIstWeekBoundaries } from '@common/utils';

import { BLOCKING_SUBMISSION_STATUSES, IN_FLIGHT_SUBMISSION_STATUSES } from './constants';

/**
 * Whether one person can do a task now, worked out from their own submissions with the same rules the submit step
 * enforces (TaskSubmissionRepository.createWithinLimit, FR-016): a submission still being checked blocks another, and
 * in-flight plus approved submissions count towards the task's limit for its period. Rejected ones do not.
 */
export type TaskAvailabilityState =
  /** Can be started and submitted. */
  | 'AVAILABLE'
  /** A submission is waiting to be checked or approved. */
  | 'IN_REVIEW'
  /** Done as many times as the task ever allows (a once-only task, approved). */
  | 'COMPLETED'
  /** Done as many times as allowed this day, week or month; `availableAgainAt` says when it opens again. */
  | 'LIMIT_REACHED';

export interface TaskAvailability {
  state: TaskAvailabilityState;
  availableAgainAt: Date | null;
  /** Approved completions in the task's whole life: what the person was paid for. */
  timesCompleted: number;
}

export interface LimitedTask {
  completionLimit: TaskCompletionLimit;
  maxCompletionsPerPeriod: number;
}

export interface OwnSubmission {
  status: string;
  createdAt: Date;
}

const LIMIT_PERIOD_WORDS: Partial<Record<TaskCompletionLimit, string>> = {
  DAILY: 'a day',
  WEEKLY: 'a week',
  MONTHLY: 'a month',
};

/** The current limit period in IST, or null for a once-only task (limited over its whole life). */
export function currentLimitPeriod(limit: TaskCompletionLimit, now: Date = new Date()): { start: Date; end: Date } | null {
  switch (limit) {
    case 'DAILY':
      return getIstDayBoundaries(now);
    case 'WEEKLY':
      return getIstWeekBoundaries(now);
    case 'MONTHLY':
      return getIstMonthBoundaries(now);
    default:
      return null;
  }
}

export function taskAvailability(task: LimitedTask, submissions: OwnSubmission[], now: Date = new Date()): TaskAvailability {
  const timesCompleted = submissions.filter((submission) => submission.status === 'APPROVED').length;
  const inFlight = submissions.some((submission) => (IN_FLIGHT_SUBMISSION_STATUSES as readonly string[]).includes(submission.status));
  if (inFlight) return { state: 'IN_REVIEW', availableAgainAt: null, timesCompleted };

  const period = currentLimitPeriod(task.completionLimit, now);
  const counted = submissions.filter(
    (submission) =>
      (BLOCKING_SUBMISSION_STATUSES as readonly string[]).includes(submission.status) &&
      (!period || (submission.createdAt >= period.start && submission.createdAt < period.end)),
  ).length;

  if (counted < task.maxCompletionsPerPeriod) return { state: 'AVAILABLE', availableAgainAt: null, timesCompleted };
  if (!period) return { state: 'COMPLETED', availableAgainAt: null, timesCompleted };
  return { state: 'LIMIT_REACHED', availableAgainAt: period.end, timesCompleted };
}

/** Why a task can not be done now, in the words the app shows; null when it can. */
export function unavailableMessage(task: LimitedTask, availability: TaskAvailability): string | null {
  const times = task.maxCompletionsPerPeriod === 1 ? 'once' : `${task.maxCompletionsPerPeriod} times`;
  switch (availability.state) {
    case 'AVAILABLE':
      return null;
    case 'IN_REVIEW':
      return 'This task already has a submission being checked';
    case 'COMPLETED':
      return task.maxCompletionsPerPeriod === 1
        ? 'You have already completed this task'
        : `This task can be completed ${times} in total, and you have reached that`;
    case 'LIMIT_REACHED':
      return `You can complete this task ${times} ${LIMIT_PERIOD_WORDS[task.completionLimit]}. You can do it again after ${
        availability.availableAgainAt ? formatIstDateTime(availability.availableAgainAt) : 'the period ends'
      } IST.`;
  }
}
