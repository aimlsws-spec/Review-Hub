import { Injectable, Logger } from '@nestjs/common';

import { SMART_TIMING } from '../constants';
import { UserActivityRepository } from '../repositories';
import { jitterMinutes, msUntilLocalTime, pickPreferredHour } from '../utils/send-time.util';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decides when each person should be notified: the hour they are usually active, inside the next 24 hours.
 *
 * WHY it never blocks a send: timing is an optimisation, not a requirement. If the history cannot be read, or a
 * person has too little of it, they get the default early-evening hour instead. A broadcast is never held up
 * or failed because of this.
 */
@Injectable()
export class SendTimeService {
  private readonly logger = new Logger(SendTimeService.name);

  constructor(private readonly activityRepository: UserActivityRepository) {}

  /** How long to hold back the message for each user id, in milliseconds from `now`. Every user gets an entry. */
  async computeDelays(userIds: string[], now: Date = new Date()): Promise<Map<string, number>> {
    const since = new Date(now.getTime() - SMART_TIMING.LOOKBACK_DAYS * DAY_MS);

    let activity = new Map<string, number[]>();
    try {
      activity = await this.activityRepository.hourlyActivity(userIds, since, SMART_TIMING.UTC_OFFSET_MINUTES);
    } catch (error) {
      this.logger.warn(`Could not read activity history, using the default hour for this page: ${(error as Error).message}`);
    }

    const delays = new Map<string, number>();
    for (const userId of userIds) {
      const hour = pickPreferredHour(activity.get(userId)) ?? SMART_TIMING.DEFAULT_HOUR;
      delays.set(userId, msUntilLocalTime(now, hour, jitterMinutes(userId), SMART_TIMING.UTC_OFFSET_MINUTES));
    }
    return delays;
  }
}
