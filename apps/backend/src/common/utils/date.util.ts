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
