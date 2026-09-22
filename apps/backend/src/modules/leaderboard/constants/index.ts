/** The two boards people can look at. The month is the India (IST) calendar month, the same one the withdrawal limits use. */
export const LEADERBOARD_PERIODS = ['month', 'all_time'] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LEADERBOARD_CONSTANTS = {
  DEFAULT_LIMIT: 20,
  /** A short list keeps the request cheap and the board about the people at the top, not a full roll call. */
  MAX_LIMIT: 50,
  DEFAULT_PERIOD: 'month' as LeaderboardPeriod,
} as const;
