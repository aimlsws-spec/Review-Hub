import { Injectable } from '@nestjs/common';

import { haversineDistanceMeters } from '@common/utils';

export interface LocationCheckinVerdict {
  passed: boolean;
  distanceMeters?: number;
  reason?: string;
}

const DEFAULT_RADIUS_METERS = 200;

/**
 * Checks a submitted device position against the target a merchant set when creating a
 * LOCATION_CHECKIN task (`CampaignTask.configuration.{latitude,longitude,radiusMeters}`).
 * Unlike a QR code, this target is meant to be shown to the user (they need to know where
 * to go), so it is never redacted from what the app receives.
 */
@Injectable()
export class LocationCheckinVerificationService {
  verify(configuration: unknown, submitted: { latitude: number; longitude: number } | null): LocationCheckinVerdict {
    const target = this.targetPoint(configuration);

    if (!submitted) {
      return { passed: false, reason: 'Your location is required for this task' };
    }
    if (!target) {
      return { passed: false, reason: 'This task has no location configured' };
    }

    const distanceMeters = haversineDistanceMeters(submitted, target);
    if (distanceMeters > target.radiusMeters) {
      return {
        passed: false,
        distanceMeters,
        reason: `You need to be within ${target.radiusMeters}m of the location (you were ${Math.round(distanceMeters)}m away)`,
      };
    }
    return { passed: true, distanceMeters };
  }

  private targetPoint(configuration: unknown): { latitude: number; longitude: number; radiusMeters: number } | null {
    if (!configuration || typeof configuration !== 'object') return null;
    const config = configuration as Record<string, unknown>;
    const { latitude, longitude, radiusMeters } = config;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return { latitude, longitude, radiusMeters: typeof radiusMeters === 'number' ? radiusMeters : DEFAULT_RADIUS_METERS };
  }
}
