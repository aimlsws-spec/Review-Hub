import { chartKeys, earningsSeries, summariseEarnings, type EarningRow } from './earnings';

const row = (type: EarningRow['type'], amount: number, referenceType: string | null, at = '2026-10-02T06:00:00Z'): EarningRow => ({
  type,
  amount,
  referenceType,
  createdAt: new Date(at),
});

describe('summariseEarnings', () => {
  it('splits task rewards, bonuses and referrals, and nets clawbacks off task earnings', () => {
    const result = summariseEarnings([
      row('CREDIT', 50, 'Reward'),
      row('CREDIT', 25.5, 'Reward'),
      row('CLAWBACK', 25.5, 'Reward'),
      row('BONUS', 10, 'DailyRewardPrize'),
      row('REFERRAL', 100, 'ReferralReward'),
    ]);

    expect(result).toEqual({ tasks: 50, bonus: 10, referral: 100, total: 160 });
  });

  it('leaves out money that is not earnings, such as a refunded withdrawal or a test top-up', () => {
    const result = summariseEarnings([row('CREDIT', 500, null), row('REFUND', 300, 'WithdrawalRequest'), row('DEBIT', 40, 'MarketplaceItem')]);

    expect(result).toEqual({ tasks: 0, bonus: 0, referral: 0, total: 0 });
  });

  it('reads Prisma decimals', () => {
    const decimal = { toString: () => '12.34' };
    expect(summariseEarnings([{ ...row('BONUS', 0, null), amount: decimal }]).bonus).toBe(12.34);
  });
});

describe('earnings charts', () => {
  const now = new Date('2026-10-03T10:00:00Z');

  it('shows the last 7 India days, oldest first, including empty ones', () => {
    expect(chartKeys('week', now)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('shows the last 6 months, across a year boundary', () => {
    expect(chartKeys('month', new Date('2027-02-10T00:00:00Z'))).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('adds each day net of clawbacks, using India days', () => {
    const series = earningsSeries(
      [
        row('CREDIT', 40, 'Reward', '2026-10-02T06:00:00Z'),
        row('CLAWBACK', 15, 'Reward', '2026-10-02T08:00:00Z'),
        // 20:00 UTC on 2 Oct is already 3 Oct in India.
        row('BONUS', 5, null, '2026-10-02T20:00:00Z'),
        row('REFERRAL', 100, null, '2026-08-01T06:00:00Z'),
      ],
      'week',
      now,
    );

    expect(series.slice(-2)).toEqual([
      { key: '2026-10-02', amount: 25 },
      { key: '2026-10-03', amount: 5 },
    ]);
    expect(series.reduce((sum, point) => sum + point.amount, 0)).toBe(30);
  });

  it('adds by month', () => {
    const series = earningsSeries([row('REFERRAL', 100, null, '2026-08-01T06:00:00Z'), row('BONUS', 5, null)], 'month', now);

    expect(series).toEqual([
      { key: '2026-05', amount: 0 },
      { key: '2026-06', amount: 0 },
      { key: '2026-07', amount: 0 },
      { key: '2026-08', amount: 100 },
      { key: '2026-09', amount: 0 },
      { key: '2026-10', amount: 5 },
    ]);
  });
});
