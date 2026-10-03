import { addOneMonth, featuredUntilAfter, withGst } from './billing';

describe('subscription billing', () => {
  it('adds GST on top of the price', () => {
    expect(withGst(999, 18)).toEqual({ taxableAmount: 999, gstRate: 18, gstAmount: 179.82, totalAmount: 1178.82 });
    expect(withGst(0, 18)).toEqual({ taxableAmount: 0, gstRate: 18, gstAmount: 0, totalAmount: 0 });
  });

  it.each([
    ['2026-01-31T10:00:00.000Z', '2026-02-28T10:00:00.000Z'],
    ['2028-01-31T10:00:00.000Z', '2028-02-29T10:00:00.000Z'],
    ['2026-04-30T06:30:00.000Z', '2026-05-30T06:30:00.000Z'],
    ['2026-12-15T00:00:00.000Z', '2027-01-15T00:00:00.000Z'],
  ])('a month after %s is %s', (start, end) => {
    expect(addOneMonth(new Date(start)).toISOString()).toBe(end);
  });

  it('extends an unexpired featured period instead of overlapping it', () => {
    const now = new Date('2026-10-03T00:00:00Z');

    expect(featuredUntilAfter(null, now, 7).toISOString()).toBe('2026-10-10T00:00:00.000Z');
    expect(featuredUntilAfter(new Date('2026-10-05T00:00:00Z'), now, 7).toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(featuredUntilAfter(new Date('2026-09-01T00:00:00Z'), now, 7).toISOString()).toBe('2026-10-10T00:00:00.000Z');
  });
});
