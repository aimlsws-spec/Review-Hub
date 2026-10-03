const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * "Today" in IST (Asia/Kolkata, UTC+5:30, fixed — no DST) as a [start, end)
 * UTC instant range, suitable for a Prisma `createdAt: { gte, lt }` filter.
 *
 * This platform has no per-user-timezone convention anywhere else in the
 * codebase — every existing date-range query (e.g. settlement periods) uses
 * plain UTC boundaries. Since the business itself operates in IST, a fixed
 * offset here is more correct for "today" from an actual user's perspective
 * than raw UTC, without introducing a new per-user-timezone pattern.
 */
export function getIstDayBoundaries(now: Date = new Date()): { start: Date; end: Date } {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istMidnightUtcMs = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  const start = new Date(istMidnightUtcMs - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** The current calendar week in IST (Monday to Sunday) as a [start, end) UTC instant range. */
export function getIstWeekBoundaries(now: Date = new Date()): { start: Date; end: Date } {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const istMidnightUtcMs = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  // getUTCDay() is 0 for Sunday, 1 for Monday... 6 for Saturday
  const dayOfWeek = istNow.getUTCDay();
  // We want Monday to be 0, Sunday to be 6
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = new Date(istMidnightUtcMs - IST_OFFSET_MS - (daysSinceMonday * 24 * 60 * 60 * 1000));
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** The current calendar month in IST as a [start, end) UTC instant range, for monthly limits. */
export function getIstMonthBoundaries(now: Date = new Date()): { start: Date; end: Date } {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const start = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() + 1, 1) - IST_OFFSET_MS);
  return { start, end };
}

/**
 * The instant an IST calendar day starts, for a date written as "2026-09-21". Null when the text is not a real
 * calendar date (so "2026-02-31" is refused, not quietly turned into 3 March).
 */
export function parseIstDay(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utcMidnight = new Date(Date.UTC(year, month - 1, day));
  if (utcMidnight.getUTCFullYear() !== year || utcMidnight.getUTCMonth() !== month - 1 || utcMidnight.getUTCDate() !== day) return null;
  return new Date(utcMidnight.getTime() - IST_OFFSET_MS);
}

/** How a UTC instant reads on an IST clock, as "2026-09-21 14:05", for files people open in a spreadsheet. */
export function formatIstDateTime(instant: Date): string {
  const ist = new Date(instant.getTime() + IST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

/** The IST calendar day an instant falls on, as "2026-09-21": a stable key for grouping by day. */
export function istDayKey(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The IST calendar month an instant falls on, as "2026-09". */
export function istMonthKey(instant: Date): string {
  return istDayKey(instant).slice(0, 7);
}
