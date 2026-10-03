import { Injectable } from '@nestjs/common';

import { getIstDayBoundaries, istDayKey } from '@common/utils';

import { DailyValue, DashboardMetricsRepository } from '../repositories/dashboard-metrics.repository';

export const DASHBOARD_SERIES = [
  'commission',
  'newUsers',
  'campaignsCreated',
  'withdrawalsRequested',
  'withdrawalsPaid',
  'fraudFlags',
] as const;

export type DashboardSeriesName = (typeof DASHBOARD_SERIES)[number];

/** One IST day of the dashboard charts. Days with no activity are present with zeros. */
export type DashboardDay = { day: string } & Record<DashboardSeriesName, number>;

export interface DashboardSeries {
  days: DashboardDay[];
  totals: Record<DashboardSeriesName, number>;
  activeCampaigns: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The admin dashboard's charts: platform activity per IST day over a recent range. */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly metrics: DashboardMetricsRepository) {}

  /** The last `days` IST days, ending today. Also used by the daily admin summary (days = 1, ending yesterday). */
  async getSeries(days: number, now: Date = new Date()): Promise<DashboardSeries> {
    const end = getIstDayBoundaries(now).end;
    const start = new Date(end.getTime() - days * DAY_MS);
    return this.seriesBetween(start, end);
  }

  /** Same figures for an exact [start, end) of whole IST days. */
  async seriesBetween(start: Date, end: Date): Promise<DashboardSeries> {
    const [commission, newUsers, campaignsCreated, withdrawalsRequested, withdrawalsPaid, fraudFlags, activeCampaigns] =
      await Promise.all([
        this.metrics.commissionByDay(start, end),
        this.metrics.newUsersByDay(start, end),
        this.metrics.campaignsCreatedByDay(start, end),
        this.metrics.withdrawalsRequestedByDay(start, end),
        this.metrics.withdrawalsPaidByDay(start, end),
        this.metrics.fraudFlagsByDay(start, end),
        this.metrics.countActiveCampaigns(),
      ]);
    const byName: Record<DashboardSeriesName, DailyValue[]> = {
      commission,
      newUsers,
      campaignsCreated,
      withdrawalsRequested,
      withdrawalsPaid,
      fraudFlags,
    };

    const keys: string[] = [];
    for (let at = start.getTime(); at < end.getTime(); at += DAY_MS) keys.push(istDayKey(new Date(at)));

    const days = keys.map((day) => {
      const entry = { day } as DashboardDay;
      for (const name of DASHBOARD_SERIES) entry[name] = byName[name].find((row) => row.day === day)?.value ?? 0;
      return entry;
    });
    const totals = Object.fromEntries(
      DASHBOARD_SERIES.map((name) => [name, Math.round(days.reduce((sum, day) => sum + day[name], 0) * 100) / 100]),
    ) as Record<DashboardSeriesName, number>;

    return { days, totals, activeCampaigns };
  }
}
