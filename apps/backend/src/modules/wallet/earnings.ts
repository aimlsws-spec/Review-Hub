import type { WalletTransactionType } from '@prisma/client';

import { istDayKey, istMonthKey } from '@common/utils';

/**
 * What a person has earned, worked out from their wallet ledger rather than stored separately: every successful
 * entry of an earning type is counted once, so the figures can never drift from the balance.
 *
 * - tasks: task rewards (CREDIT with a Reward reference), less rewards clawed back after a fraud review.
 * - bonus: daily-reward prizes (BONUS).
 * - referral: referral rewards (REFERRAL).
 *
 * There is no cashback anywhere in the platform yet, so there is no cashback figure. Other credits (refunds of failed
 * withdrawals, test top-ups) are money coming back, not earnings, and are left out.
 */
export const EARNING_TRANSACTION_TYPES: WalletTransactionType[] = ['CREDIT', 'BONUS', 'REFERRAL', 'CLAWBACK'];

export interface EarningRow {
  type: WalletTransactionType;
  amount: number | { toString(): string };
  referenceType: string | null;
  createdAt: Date;
}

export interface EarningsBreakdown {
  tasks: number;
  bonus: number;
  referral: number;
  total: number;
}

export type EarningsPeriod = 'week' | 'month';

export interface EarningsPoint {
  /** "2026-09-21" for a day, "2026-09" for a month. */
  key: string;
  amount: number;
}

/** Signed effect of one ledger entry on earnings, and which bucket it belongs to. */
function classify(row: EarningRow): { bucket: keyof Omit<EarningsBreakdown, 'total'>; amount: number } | null {
  const amount = Number(row.amount);
  switch (row.type) {
    case 'CREDIT':
      return row.referenceType === 'Reward' ? { bucket: 'tasks', amount } : null;
    case 'CLAWBACK':
      return { bucket: 'tasks', amount: -amount };
    case 'BONUS':
      return { bucket: 'bonus', amount };
    case 'REFERRAL':
      return { bucket: 'referral', amount };
    default:
      return null;
  }
}

const round = (value: number) => Math.round(value * 100) / 100;

export function summariseEarnings(rows: EarningRow[]): EarningsBreakdown {
  const totals = { tasks: 0, bonus: 0, referral: 0 };
  for (const row of rows) {
    const entry = classify(row);
    if (entry) totals[entry.bucket] += entry.amount;
  }
  const breakdown = { tasks: round(totals.tasks), bonus: round(totals.bonus), referral: round(totals.referral) };
  return { ...breakdown, total: round(breakdown.tasks + breakdown.bonus + breakdown.referral) };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days in the "week" chart, and months in the "month" chart. */
export const EARNINGS_CHART_LENGTH: Record<EarningsPeriod, number> = { week: 7, month: 6 };

/** The keys the chart shows, oldest first, ending with the current day or month (IST). Empty ones still appear. */
export function chartKeys(period: EarningsPeriod, now: Date): string[] {
  const count = EARNINGS_CHART_LENGTH[period];
  if (period === 'week') {
    return Array.from({ length: count }, (_, i) => istDayKey(new Date(now.getTime() - (count - 1 - i) * DAY_MS)));
  }
  const [year, month] = istMonthKey(now).split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** Net earnings per IST day ('week') or month ('month'), one point per key from chartKeys. */
export function earningsSeries(rows: EarningRow[], period: EarningsPeriod, now: Date): EarningsPoint[] {
  const keys = chartKeys(period, now);
  const sums = new Map(keys.map((key) => [key, 0]));
  for (const row of rows) {
    const entry = classify(row);
    if (!entry) continue;
    const key = period === 'week' ? istDayKey(row.createdAt) : istMonthKey(row.createdAt);
    if (sums.has(key)) sums.set(key, (sums.get(key) as number) + entry.amount);
  }
  return keys.map((key) => ({ key, amount: round(sums.get(key) as number) }));
}
