import { SMART_TIMING } from '../constants';

import { formatUtcOffset, jitterMinutes, msUntilLocalTime, pickPreferredHour } from './send-time.util';

const MIN = 60_000;
const HOUR = 60 * MIN;
const IST = SMART_TIMING.UTC_OFFSET_MINUTES;

/** 24 counts with the given hours filled in. */
const activity = (byHour: Record<number, number>) => Array.from({ length: 24 }, (_, hour) => byHour[hour] ?? 0);

describe('pickPreferredHour', () => {
  it('picks the hour with the most activity', () => {
    expect(pickPreferredHour(activity({ 12: 3, 20: 9, 15: 4 }))).toBe(20);
  });

  it('gives the earlier hour when two are tied, so the same history always gives the same answer', () => {
    expect(pickPreferredHour(activity({ 11: 5, 18: 5 }))).toBe(11);
  });

  it('returns nothing when there is too little activity to call it a habit', () => {
    expect(pickPreferredHour(activity({ 20: SMART_TIMING.MIN_ACTIVITIES - 1 }))).toBeNull();
    expect(pickPreferredHour(activity({ 20: SMART_TIMING.MIN_ACTIVITIES }))).toBe(20);
  });

  it('returns nothing without a history', () => {
    expect(pickPreferredHour(undefined)).toBeNull();
    expect(pickPreferredHour([])).toBeNull();
    expect(pickPreferredHour([1, 2, 3])).toBeNull();
  });

  it('never picks a night hour, however busy the person is then', () => {
    expect(pickPreferredHour(activity({ 2: 50, 23: 50, 14: 6 }))).toBe(14);
  });

  it('returns nothing for someone who is only ever active at night', () => {
    expect(pickPreferredHour(activity({ 1: 30, 23: 30 }))).toBeNull();
  });

  it('allows the first and last hour of the sending window', () => {
    expect(pickPreferredHour(activity({ [SMART_TIMING.EARLIEST_HOUR]: 9 }))).toBe(SMART_TIMING.EARLIEST_HOUR);
    expect(pickPreferredHour(activity({ [SMART_TIMING.LATEST_HOUR]: 9 }))).toBe(SMART_TIMING.LATEST_HOUR);
    expect(pickPreferredHour(activity({ [SMART_TIMING.EARLIEST_HOUR - 1]: 9 }))).toBeNull();
    expect(pickPreferredHour(activity({ [SMART_TIMING.LATEST_HOUR + 1]: 9 }))).toBeNull();
  });
});

describe('jitterMinutes', () => {
  it('stays between 0 and 59', () => {
    for (let i = 0; i < 200; i++) {
      const value = jitterMinutes(`user-${i}`);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(60);
    }
  });

  it('gives the same person the same minute every time', () => {
    expect(jitterMinutes('abc-123')).toBe(jitterMinutes('abc-123'));
  });

  it('spreads people across the hour', () => {
    const distinct = new Set(Array.from({ length: 300 }, (_, i) => jitterMinutes(`user-${i}`)));
    expect(distinct.size).toBeGreaterThan(40);
  });
});

describe('msUntilLocalTime', () => {
  // 2026-09-19 10:00 UTC is 15:30 in India.
  const now = new Date('2026-09-19T10:00:00.000Z');

  it('waits until later the same day when the time is still ahead', () => {
    expect(msUntilLocalTime(now, 19, 0, IST)).toBe(3 * HOUR + 30 * MIN);
  });

  it('waits until tomorrow when the time has already passed today', () => {
    expect(msUntilLocalTime(now, 9, 0, IST)).toBe(17 * HOUR + 30 * MIN);
  });

  it('adds the minutes', () => {
    expect(msUntilLocalTime(now, 19, 45, IST)).toBe(4 * HOUR + 15 * MIN);
  });

  it('sends right now when it is exactly the time', () => {
    expect(msUntilLocalTime(new Date('2026-09-19T13:30:00.000Z'), 19, 0, IST)).toBe(0);
  });

  it('is never a full day or more', () => {
    for (let h = 0; h < 24; h++) {
      const delay = msUntilLocalTime(new Date(Date.UTC(2026, 8, 19, h, 17)), 19, 30, IST);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(24 * HOUR);
    }
  });

  it('crosses midnight and month ends correctly', () => {
    // 2026-09-30 20:00 UTC is 01:30 on 1 October in India; 9:00 is 7.5 hours away.
    expect(msUntilLocalTime(new Date('2026-09-30T20:00:00.000Z'), 9, 0, IST)).toBe(7 * HOUR + 30 * MIN);
  });

  it('works with a zero offset', () => {
    expect(msUntilLocalTime(now, 12, 0, 0)).toBe(2 * HOUR);
  });
});

describe('formatUtcOffset', () => {
  it.each([
    [330, '+05:30'],
    [0, '+00:00'],
    [-300, '-05:00'],
    [-570, '-09:30'],
    [60, '+01:00'],
  ])('formats %d minutes as %s', (minutes, expected) => {
    expect(formatUtcOffset(minutes)).toBe(expected);
  });
});
