import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { formatUtcOffset } from '../utils/send-time.util';

/**
 * When people are active in the app. It counts three things people only do when they have the app open: logging
 * in, opening a notification, and submitting a task. Logins alone are too rare, because a phone keeps people
 * signed in for weeks.
 */
@Injectable()
export class UserActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * For each user, how many times they were active in each hour of the day (24 numbers, index = hour) since
   * `since`, on the clock of the given UTC offset. Users with no activity are not in the map.
   *
   * One grouped query for the whole page of users, so the cost does not grow with the number of recipients.
   * The hour is worked out inside MySQL with a fixed offset (no time zone tables needed).
   */
  async hourlyActivity(userIds: string[], since: Date, utcOffsetMinutes: number): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    if (!userIds.length) return result;

    const ids = Prisma.join(userIds);
    const offset = formatUtcOffset(utcOffsetMinutes);

    const rows = await this.prisma.$queryRaw<Array<{ userId: string; hourOfDay: number | bigint; activities: number | bigint }>>(Prisma.sql`
      SELECT e.userId AS userId,
             HOUR(CONVERT_TZ(e.at, '+00:00', ${offset})) AS hourOfDay,
             COUNT(*) AS activities
      FROM (
        SELECT userId, loginAt AS at FROM login_history
          WHERE isSuccess = 1 AND loginAt >= ${since} AND userId IN (${ids})
        UNION ALL
        SELECT userId, readAt AS at FROM notifications
          WHERE readAt IS NOT NULL AND readAt >= ${since} AND userId IN (${ids})
        UNION ALL
        SELECT userId, createdAt AS at FROM task_submissions
          WHERE deletedAt IS NULL AND createdAt >= ${since} AND userId IN (${ids})
      ) e
      GROUP BY e.userId, hourOfDay
    `);

    for (const row of rows) {
      // Number(null) is 0, which would count a missing hour as midnight.
      if (row.hourOfDay === null || row.hourOfDay === undefined) continue;
      const hour = Number(row.hourOfDay);
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
      const counts = result.get(row.userId) ?? new Array<number>(24).fill(0);
      counts[hour] += Number(row.activities);
      result.set(row.userId, counts);
    }
    return result;
  }
}
