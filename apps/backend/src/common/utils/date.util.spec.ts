import { getIstDayBoundaries } from './date.util';

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
