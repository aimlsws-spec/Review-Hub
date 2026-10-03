import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

import { LATENCY_SAMPLE_SIZE } from './ai-call-log.constants';

/** One IST day of AI calls. */
export interface AiCallDay {
  day: string;
  calls: number;
  failed: number;
  fallback: number;
  tokens: number;
  cost: number;
}

/** One feature's AI calls over a period. */
export interface AiCallFeatureRow {
  feature: string;
  calls: number;
  failed: number;
  fallback: number;
  tokens: number;
  cost: number;
}

interface RawDay {
  day: Date | string;
  calls: bigint | number;
  failed: bigint | number | string | null;
  fallback: bigint | number | string | null;
  tokens: bigint | number | string | null;
  cost: bigint | number | string | { toString(): string } | null;
}

@Injectable()
export class AiCallLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AIUsageLogCreateInput) {
    return this.prisma.aIUsageLog.create({ data });
  }

  /** Prices per 1,000 tokens from the highest-priority enabled provider's configuration, when an admin set them. */
  async findPricedProvider(): Promise<{ id: string; inputPer1k: number; outputPer1k: number } | null> {
    const provider = await this.prisma.aIProvider.findFirst({
      where: { enabled: true, deletedAt: null },
      orderBy: { priority: 'desc' },
      select: { id: true, configuration: true },
    });
    const config = (provider?.configuration ?? {}) as Record<string, unknown>;
    const inputPer1k = Number(config.inputPricePer1kTokens);
    const outputPer1k = Number(config.outputPricePer1kTokens);
    if (!provider || !Number.isFinite(inputPer1k) || !Number.isFinite(outputPer1k)) return null;
    return { id: provider.id, inputPer1k, outputPer1k };
  }

  /** Calls per IST day in [start, end), grouped in MySQL. */
  async byDay(start: Date, end: Date): Promise<AiCallDay[]> {
    const rows = await this.prisma.$queryRaw<RawDay[]>`
      SELECT DATE(DATE_ADD(createdAt, INTERVAL 330 MINUTE)) AS day,
             COUNT(*) AS calls,
             SUM(responseStatus IN ('FAILED', 'TIMEOUT', 'RATE_LIMITED')) AS failed,
             SUM(responseStatus = 'FALLBACK') AS fallback,
             SUM(tokens) AS tokens,
             SUM(cost) AS cost
      FROM ai_usage_logs
      WHERE createdAt >= ${start} AND createdAt < ${end} AND deletedAt IS NULL
      GROUP BY day`;
    return rows.map((row) => ({
      day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
      calls: Number(row.calls),
      failed: Number(row.failed ?? 0),
      fallback: Number(row.fallback ?? 0),
      tokens: Number(row.tokens ?? 0),
      cost: Number(row.cost ?? 0),
    }));
  }

  /** Calls per feature and outcome in [start, end). */
  async byFeature(start: Date, end: Date): Promise<AiCallFeatureRow[]> {
    const groups = await this.prisma.aIUsageLog.groupBy({
      by: ['feature', 'responseStatus'],
      where: { createdAt: { gte: start, lt: end }, deletedAt: null },
      _count: { _all: true },
      _sum: { tokens: true, cost: true },
    });
    const rows = new Map<string, AiCallFeatureRow>();
    for (const group of groups) {
      const row = rows.get(group.feature) ?? { feature: group.feature, calls: 0, failed: 0, fallback: 0, tokens: 0, cost: 0 };
      row.calls += group._count._all;
      if (['FAILED', 'TIMEOUT', 'RATE_LIMITED'].includes(group.responseStatus)) row.failed += group._count._all;
      if (group.responseStatus === 'FALLBACK') row.fallback += group._count._all;
      row.tokens += group._sum.tokens ?? 0;
      row.cost += Number(group._sum.cost ?? 0);
      rows.set(group.feature, row);
    }
    return [...rows.values()];
  }

  /** The most recent latencies of one feature, for its 95th percentile. */
  async latencies(feature: string, start: Date, end: Date): Promise<number[]> {
    const rows = await this.prisma.aIUsageLog.findMany({
      where: { feature, createdAt: { gte: start, lt: end }, deletedAt: null },
      select: { latency: true },
      orderBy: { createdAt: 'desc' },
      take: LATENCY_SAMPLE_SIZE,
    });
    return rows.map((row) => row.latency);
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.prisma.aIUsageLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return result.count;
  }
}
