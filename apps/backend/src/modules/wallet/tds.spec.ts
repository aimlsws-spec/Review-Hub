import { calculateTds, financialYearOf } from './tds';

describe('financialYearOf', () => {
  it.each([
    ['the last moment of the old year, on India time', '2027-03-31T18:29:59Z', '2026-27'],
    ['the first moment of the new year, on India time', '2027-03-31T18:30:00Z', '2027-28'],
    ['mid-year', '2026-09-21T12:00:00Z', '2026-27'],
    ['January, which belongs to the year that began the April before', '2027-01-15T06:00:00Z', '2026-27'],
    ['1 April in the small hours in India, still 31 March in UTC', '2026-03-31T19:00:00Z', '2026-27'],
    ['the end of the century', '2099-05-01T00:00:00Z', '2099-00'],
  ])('%s', (_label, moment, label) => {
    expect(financialYearOf(new Date(moment)).label).toBe(label);
  });

  it('runs from 1 April to the next 1 April on India time', () => {
    const year = financialYearOf(new Date('2026-09-21T12:00:00Z'));

    expect(year.start.toISOString()).toBe('2026-03-31T18:30:00.000Z');
    expect(year.end.toISOString()).toBe('2027-03-31T18:30:00.000Z');
  });

  it('starts exactly where the previous year ends, with no gap and no overlap', () => {
    const before = financialYearOf(new Date('2026-01-10T00:00:00Z'));
    const after = financialYearOf(new Date('2026-09-21T12:00:00Z'));

    expect(before.end.getTime()).toBe(after.start.getTime());
  });
});

describe('calculateTds', () => {
  const base = { rate: 0.1, threshold: 20000, alreadyPaidThisYear: 0, amount: 5000 };

  it('keeps nothing back while the year total stays at or under the threshold', () => {
    expect(calculateTds({ ...base, amount: 20000 })).toBe(0);
    expect(calculateTds({ ...base, alreadyPaidThisYear: 15000, amount: 5000 })).toBe(0);
  });

  it('keeps tax back from the whole of the payout that takes the total over the threshold', () => {
    expect(calculateTds({ ...base, alreadyPaidThisYear: 18000, amount: 5000 })).toBe(500);
  });

  it('keeps tax back from every payout after that', () => {
    expect(calculateTds({ ...base, alreadyPaidThisYear: 25000, amount: 1000 })).toBe(100);
  });

  it('is off when the rate is 0, whatever has been paid', () => {
    expect(calculateTds({ ...base, rate: 0, alreadyPaidThisYear: 1_000_000 })).toBe(0);
  });

  it('keeps tax back from the first payout when there is no threshold', () => {
    expect(calculateTds({ ...base, threshold: 0 })).toBe(500);
  });

  it('rounds to the paisa', () => {
    expect(calculateTds({ rate: 0.1, threshold: 0, alreadyPaidThisYear: 0, amount: 1234.56 })).toBe(123.46);
    expect(calculateTds({ rate: 0.0075, threshold: 0, alreadyPaidThisYear: 0, amount: 1000 })).toBe(7.5);
  });

  it('never returns a negative tax or tax on nothing', () => {
    expect(calculateTds({ ...base, amount: 0 })).toBe(0);
    expect(calculateTds({ ...base, amount: -100 })).toBe(0);
    expect(calculateTds({ ...base, rate: -0.1, threshold: 0 })).toBe(0);
  });
});
