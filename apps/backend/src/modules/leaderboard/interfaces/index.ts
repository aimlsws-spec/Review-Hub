import { LeaderboardPeriod } from '../constants';

/** A time window as a [start, end) range of instants, or null for "all time". */
export type LeaderboardRange = { start: Date; end: Date } | null;

/** One row of the ranking as the repository finds it. Carries the user id so the service can spot the viewer; it is never sent out. */
export interface RankedEarner {
  userId: string;
  totalEarned: number;
}

export interface EarnerProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

/** A row as people see it: no ids, and the name shortened to a first name and an initial. */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  totalEarned: number;
  isMe: boolean;
}

/** Where the viewer stands. rank is null when they are hidden or have not earned anything in this period yet. */
export interface LeaderboardStanding {
  visible: boolean;
  rank: number | null;
  totalEarned: number;
}

export interface LeaderboardView {
  period: LeaderboardPeriod;
  /** When the month board starts over. Null for the all-time board. */
  resetsAt: Date | null;
  entries: LeaderboardEntry[];
  me: LeaderboardStanding;
}
