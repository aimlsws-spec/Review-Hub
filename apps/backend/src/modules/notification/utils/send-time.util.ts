import { createHash } from 'crypto';

import { SMART_TIMING } from '../constants';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const HOURS_IN_DAY = 24;

/**
 * The hour of the day (0-23, Indian time) a person is most often active, or null when there is too little
 * to go on. Activity in the night hours is ignored: a message is never sent then, however busy the person is.
 */
export function pickPreferredHour(activityByHour: readonly number[] | undefined): number | null {
  if (!activityByHour || activityByHour.length !== HOURS_IN_DAY) return null;

  const total = activityByHour.reduce((sum, count) => sum + count, 0);
  if (total < SMART_TIMING.MIN_ACTIVITIES) return null;

  let bestHour: number | null = null;
  let bestCount = 0;
  for (let hour = SMART_TIMING.EARLIEST_HOUR; hour <= SMART_TIMING.LATEST_HOUR; hour++) {
    // A tie goes to the earlier hour so the same history always gives the same answer.
    if (activityByHour[hour] > bestCount) {
      bestCount = activityByHour[hour];
      bestHour = hour;
    }
  }
  return bestHour;
}

/**
 * A stable 0-59 spread per person. Without it everyone whose favourite hour is 7 PM would be notified at
 * exactly 7:00 and the push service would get all of them at once. It comes from the user id, not from a
 * random number, so queueing the same person twice gives the same time.
 */
export function jitterMinutes(userId: string): number {
  const digest = createHash('sha1').update(userId).digest();
  return digest.readUInt32BE(0) % 60;
}

/**
 * Milliseconds from `now` until the next time the clock in the given UTC offset shows `hour:minute`.
 * Always between 0 (exactly now) and just under 24 hours.
 */
export function msUntilLocalTime(now: Date, hour: number, minute: number, utcOffsetMinutes: number): number {
  // Shift into local time and read it with the UTC getters, which then hold the local wall clock.
  const local = new Date(now.getTime() + utcOffsetMinutes * MINUTE_MS);
  let target = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour, minute);
  if (target < local.getTime()) target += DAY_MS;
  return target - local.getTime();
}

/** "+05:30" style offset, as MySQL's CONVERT_TZ expects. */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
