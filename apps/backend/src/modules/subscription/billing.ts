/** Money and period rules for subscriptions and featured campaigns, kept pure so they can be tested on their own. */

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface ChargeAmounts {
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

/** GST is added on top of the listed price, as on commission invoices. */
export function withGst(price: number, gstRatePercent: number): ChargeAmounts {
  const taxableAmount = round2(price);
  const gstAmount = round2(taxableAmount * (gstRatePercent / 100));
  return { taxableAmount, gstRate: gstRatePercent, gstAmount, totalAmount: round2(taxableAmount + gstAmount) };
}

/**
 * The same day next month, clamped to the month's last day: 31 Jan → 28/29 Feb, 30 Apr → 30 May. Worked out in UTC
 * on the exact instant, so a period always ends at the time of day it started.
 */
export function addOneMonth(start: Date): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const lastDayOfNextMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const day = Math.min(start.getUTCDate(), lastDayOfNextMonth);
  return new Date(
    Date.UTC(year, month + 1, day, start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()),
  );
}

/** A featured period extends an unexpired one rather than overlapping it, so buying twice adds the days. */
export function featuredUntilAfter(currentUntil: Date | null, now: Date, days: number): Date {
  const from = currentUntil && currentUntil > now ? currentUntil : now;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
