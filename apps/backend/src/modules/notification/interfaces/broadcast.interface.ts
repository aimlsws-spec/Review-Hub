import { NotificationChannel } from '@prisma/client';

/**
 * Who a broadcast reaches. Every field is optional and they combine with AND; an empty filter means
 * every active app user. Users that have opted out of a channel are skipped per channel at send time.
 */
export interface AudienceFilter {
  stateIds?: string[];
  cityIds?: string[];
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  minAge?: number;
  maxAge?: number;
  minLevel?: number;
  maxLevel?: number;
  /** true: has an approved PAN. false: does not. */
  kycVerified?: boolean;
  joinedWithinDays?: number;
  /** Has not logged in for at least this many days (accounts that never logged in count). */
  inactiveForDays?: number;
}

export type BroadcastChannel = Extract<NotificationChannel, 'IN_APP' | 'PUSH' | 'EMAIL'>;

/** How many users a broadcast would actually reach, overall and per channel. */
export interface AudienceReach {
  total: number;
  byChannel: Record<BroadcastChannel, number>;
}

export interface BroadcastFanOutJobData {
  broadcastId: string;
}
