import { formatIstDateTime, getIstDayBoundaries, parseIstDay } from './date.util';

describe('getIstDayBoundaries', () => {
  it('returns UTC instants 24h apart', () => {
    const { start, end } = getIstDayBoundaries(new Date('2026-03-15T10:00:00.000Z'));
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('treats a UTC morning as still "today" in IST (UTC+5:30)', () => {
    // 2026-03-15T10:00:00Z is 2026-03-15T15:30 IST — same IST calendar day.
    const { start, end } = getIstDayBoundaries(new Date('2026-03-15T10:00:00.000Z'));
    expect(start.toISOString()).toBe('2026-03-14T18:30:00.000Z'); // 2026-03-15T00:00 IST
    expect(end.toISOString()).toBe('2026-03-15T18:30:00.000Z'); // 2026-03-16T00:00 IST
  });

  it('rolls over to the next IST day for a UTC instant just before IST midnight', () => {
    // 2026-03-15T18:31:00Z is 2026-03-16T00:01 IST — already the next IST day.
    const { start, end } = getIstDayBoundaries(new Date('2026-03-15T18:31:00.000Z'));
    expect(start.toISOString()).toBe('2026-03-15T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-03-16T18:30:00.000Z');
  });

  it('includes `now` within [start, end)', () => {
    const now = new Date('2026-03-15T10:00:00.000Z');
    const { start, end } = getIstDayBoundaries(now);
    expect(now.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(now.getTime()).toBeLessThan(end.getTime());
  });
});

describe('parseIstDay', () => {
  it('reads a date as the start of that day in India', () => {
    expect(parseIstDay('2026-09-21')?.toISOString()).toBe('2026-09-20T18:30:00.000Z');
    expect(parseIstDay('2026-01-01')?.toISOString()).toBe('2025-12-31T18:30:00.000Z');
  });

  it('accepts a leap day only in a leap year', () => {
    expect(parseIstDay('2028-02-29')).not.toBeNull();
    expect(parseIstDay('2026-02-29')).toBeNull();
  });

  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '2026-09-00', '2026-9-1', '26-09-21', '2026/09/21', '2026-09-21T00:00:00Z', '', 'tomorrow'])(
    'refuses %j: not a real calendar date, so it is never quietly turned into another day',
    (text) => {
      expect(parseIstDay(text)).toBeNull();
    },
  );
});

describe('formatIstDateTime', () => {
  it('reads an instant on an India clock', () => {
    expect(formatIstDateTime(new Date('2026-09-21T08:35:00.000Z'))).toBe('2026-09-21 14:05');
  });

  it('rolls into the next day after 18:30 UTC', () => {
    expect(formatIstDateTime(new Date('2026-09-21T18:31:00.000Z'))).toBe('2026-09-22 00:01');
  });

  it('pads single digits', () => {
    expect(formatIstDateTime(new Date('2026-01-02T00:30:00.000Z'))).toBe('2026-01-02 06:00');
  });
});
