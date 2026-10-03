import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** One IST day's figure. `day` is "2026-09-21". */
export interface DailyValue {
  day: string;
  value: number;
}

interface RawRow {
  day: Date | string;
  value: bigint | number | string | { toString(): string } | null;
}

/**
 * Platform-wide figures per IST day, each one grouped in MySQL (never by loading rows). Days are India days:
 * timestamps are stored in UTC, so 5h30 (330 minutes) is added before taking the date. Every query is a tagged
 * template, so values are bound as parameters.
 */
@Injectable()
export class DashboardMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform commission, by the day of the settlement period it was earned in. */
  async commissionByDay(start: Date, end: Date): Promise<DailyValue[]> {
    return this.rows(await this.prisma.$queryRaw<RawRow[]>`
      SELECT DATE(DATE_ADD(periodStart, INTERVAL 330 MINUTE)) AS day, SUM(commissionAmount) AS value
      FROM settlements WHERE periodStart >= ${start} AND periodStart < ${end} GROUP BY day`);
  }

  async newUsersByDay(start: Date, end: Date): Promise<DailyValue[]> {
    return this.rows(await this.prisma.$queryRaw<RawRow[]>`
      SELECT DATE(DATE_ADD(createdAt, INTERVAL 330 MINUTE)) AS day, COUNT(*) AS value
      FROM users WHERE createdAt >= ${start} AND createdAt < ${end} AND deletedAt IS NULL GROUP BY day`);
  }

  async campaignsCreatedByDay(start: Date, end: Date): Promise<DailyValue[]> {
    return this.rows(await this.prisma.$queryRaw<RawRow[]>`
      SELECT DATE(DATE_ADD(createdAt, INTERVAL 330 MINUTE)) AS day, COUNT(*) AS value
      FROM campaigns WHERE createdAt >= ${start} AND createdAt < ${end} AND deletedAt IS NULL GROUP BY day`);
  }

  /** Amount asked for in withdrawals, by the day they were requested. */
  async withdrawalsRequestedByDay(start: Date, end: Date): Promise<DailyValue[]> {
    return this.rows(await this.prisma.$queryRaw<RawRow[]>`
      SELECT DATE(DATE_ADD(createdAt, INTERVAL 330 MINUTE)) AS day, SUM(amount) AS value
      FROM withdrawal_requests WHERE createdAt >= ${start} AND createdAt < ${end} GROUP BY day`);
  }

  /** Amount actually paid out, by the day it was paid. */
  async withdrawalsPaidByDay(start: Date, end: Date): Promise<DailyValue[]> {
    return this.rows(await this.prisma.$queryRaw<RawRow[]>`
      SELECT DATE(DATE_ADD(paidAt, INTERVAL 330 MINUTE)) AS day, SUM(finalAmount) AS value
      FROM withdrawal_requests WHERE status = 'PAID' AND paidAt >= ${start} AND paidAt < ${end} GROUP BY day`);
  }

  async fraudFlagsByDay(start: Date, end: Date): Promise<DailyValue[]> {
    return this.rows(await this.prisma.$queryRaw<RawRow[]>`
      SELECT DATE(DATE_ADD(createdAt, INTERVAL 330 MINUTE)) AS day, COUNT(*) AS value
      FROM fraud_flags WHERE createdAt >= ${start} AND createdAt < ${end} GROUP BY day`);
  }

  /** Campaigns running right now: a snapshot, since past activity is not recorded per day. */
  async countActiveCampaigns(): Promise<number> {
    return this.prisma.campaign.count({ where: { status: 'ACTIVE', deletedAt: null } });
  }

  private rows(raw: RawRow[]): DailyValue[] {
    return raw.map((row) => ({
      day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
      value: Number(row.value ?? 0),
    }));
  }
}
