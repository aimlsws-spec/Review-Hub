const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** An Indian financial year runs from 1 April to 31 March. Its label is the two calendar years it touches, like 2026-27. */
export interface FinancialYear {
  label: string;
  start: Date;
  end: Date;
}

/** The financial year a moment falls in, worked out on India time so a payout at 1 a.m. on 1 April counts as the new year. */
export function financialYearOf(moment: Date): FinancialYear {
  const ist = new Date(moment.getTime() + IST_OFFSET_MS);
  const startYear = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  const start = new Date(Date.UTC(startYear, 3, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(startYear + 1, 3, 1) - IST_OFFSET_MS);
  return { label: `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`, start, end };
}

/**
 * The tax to keep back from one payout.
 *
 * Nothing is kept back until the user's payouts for the year, this one included, go above the threshold. From the payout
 * that takes them over, tax is kept back from the whole of that payout and every payout after it. A rate of 0 means
 * the platform does not deduct tax at all.
 *
 * WHY it is written this way and stays configurable: which section applies, at what rate and from what threshold is a tax
 * matter for the platform's adviser. This is only the arithmetic, done the same way every time and to the paisa.
 */
export function calculateTds(params: { rate: number; threshold: number; alreadyPaidThisYear: number; amount: number }): number {
  const { rate, threshold, alreadyPaidThisYear, amount } = params;
  if (rate <= 0 || amount <= 0) return 0;
  if (alreadyPaidThisYear + amount <= threshold) return 0;
  return Math.round(amount * rate * 100) / 100;
}
