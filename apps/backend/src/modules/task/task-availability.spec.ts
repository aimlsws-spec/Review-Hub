import { taskAvailability, unavailableMessage } from './task-availability';

describe('task availability', () => {
  // 8 Oct 2026, 15:30 IST. The IST day runs from 7 Oct 18:30 UTC to 8 Oct 18:30 UTC.
  const now = new Date('2026-10-08T10:00:00Z');
  const once = { completionLimit: 'ONCE' as const, maxCompletionsPerPeriod: 1 };
  const daily = { completionLimit: 'DAILY' as const, maxCompletionsPerPeriod: 1 };
  const submission = (status: string, createdAt = '2026-10-08T09:00:00Z') => ({ status, createdAt: new Date(createdAt) });

  it('is open when the person has done nothing yet', () => {
    expect(taskAvailability(once, [], now)).toEqual({ state: 'AVAILABLE', availableAgainAt: null, timesCompleted: 0 });
  });

  it('is completed for good once a once-only task is approved', () => {
    const result = taskAvailability(once, [submission('APPROVED')], now);
    expect(result).toEqual({ state: 'COMPLETED', availableAgainAt: null, timesCompleted: 1 });
    expect(unavailableMessage(once, result)).toBe('You have already completed this task');
  });

  it.each(['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL'])('is in review while a submission is %s', (status) => {
    const result = taskAvailability(once, [submission(status)], now);
    expect(result.state).toBe('IN_REVIEW');
    expect(unavailableMessage(once, result)).toBe('This task already has a submission being checked');
  });

  it('opens again after a rejection, which does not count', () => {
    expect(taskAvailability(once, [submission('REJECTED')], now).state).toBe('AVAILABLE');
  });

  it('closes a daily task for the rest of the IST day, and says when it opens', () => {
    const result = taskAvailability(daily, [submission('APPROVED')], now);
    expect(result).toEqual({ state: 'LIMIT_REACHED', availableAgainAt: new Date('2026-10-08T18:30:00Z'), timesCompleted: 1 });
    expect(unavailableMessage(daily, result)).toMatch(/^You can complete this task once a day\. You can do it again after .* IST\.$/);
  });

  it('opens a daily task again the next day, still counting what was paid before', () => {
    const result = taskAvailability(daily, [submission('APPROVED', '2026-10-07T09:00:00Z')], now);
    expect(result).toEqual({ state: 'AVAILABLE', availableAgainAt: null, timesCompleted: 1 });
  });

  it('allows a task done up to N times until the Nth', () => {
    const twice = { completionLimit: 'ONCE' as const, maxCompletionsPerPeriod: 2 };
    expect(taskAvailability(twice, [submission('APPROVED')], now).state).toBe('AVAILABLE');
    const done = taskAvailability(twice, [submission('APPROVED'), submission('APPROVED')], now);
    expect(done.state).toBe('COMPLETED');
    expect(unavailableMessage(twice, done)).toBe('This task can be completed 2 times in total, and you have reached that');
  });

  it('has no message for an open task', () => {
    expect(unavailableMessage(once, taskAvailability(once, [], now))).toBeNull();
  });
});
