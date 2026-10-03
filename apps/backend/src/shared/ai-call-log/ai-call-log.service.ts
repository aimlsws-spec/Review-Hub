import { Injectable, Logger } from '@nestjs/common';

import { getIstDayBoundaries, istDayKey } from '@common/utils';

import { AI_CALL_LOG_RETENTION_DAYS, AiCallFeature, AiCallStatus, CHARACTERS_PER_TOKEN } from './ai-call-log.constants';
import { AiCallLogRepository } from './ai-call-log.repository';

/** One AI call to record. `input`/`output` are only measured, never stored. */
export interface AiCallRecord {
  feature: AiCallFeature;
  status: AiCallStatus;
  latencyMs: number;
  input?: unknown;
  output?: unknown;
  model?: string | null;
  promptVersion?: string;
  confidence?: number | null;
  userId?: string | null;
  submissionId?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rough token count from the size of a value: the AI service does not report usage. */
export function estimateTokens(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return Math.ceil((text?.length ?? 0) / CHARACTERS_PER_TOKEN);
}

/** 95th percentile, nearest-rank. 0 for no samples. */
export function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)];
}

/** Starts a clock for an AI call; call the result to get the elapsed milliseconds. */
export function startAiTimer(): () => number {
  const started = Date.now();
  return () => Date.now() - started;
}

/**
 * Records every outbound AI call: what it was for, how it ended, how long it took, estimated tokens and cost. Prompts,
 * answers and personal data are never stored, only their sizes and ids. Recording never fails the call it describes:
 * a write that fails is logged and dropped.
 */
@Injectable()
export class AiCallLogService {
  private readonly logger = new Logger(AiCallLogService.name);

  constructor(private readonly repository: AiCallLogRepository) {}

  async record(entry: AiCallRecord): Promise<void> {
    try {
      const inputTokens = estimateTokens(entry.input);
      const outputTokens = estimateTokens(entry.output);
      const prices = await this.repository.findPricedProvider();
      const cost = prices ? (inputTokens / 1000) * prices.inputPer1k + (outputTokens / 1000) * prices.outputPer1k : 0;

      await this.repository.create({
        feature: entry.feature,
        responseStatus: entry.status,
        latency: Math.max(0, Math.round(entry.latencyMs)),
        inputTokens,
        outputTokens,
        tokens: inputTokens + outputTokens,
        cost: Math.round(cost * 1e6) / 1e6,
        model: entry.model ?? null,
        promptVersion: entry.promptVersion ?? null,
        confidence: entry.confidence ?? null,
        userId: entry.userId ?? null,
        submissionId: entry.submissionId ?? null,
        ...(prices ? { provider: { connect: { id: prices.id } } } : {}),
      });
    } catch (error) {
      this.logger.warn(`Could not record an AI call (${entry.feature}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** The admin AI monitoring page: calls per IST day and per feature over the last `days` days. */
  async monitoring(days: number, now: Date = new Date()) {
    const end = getIstDayBoundaries(now).end;
    const start = new Date(end.getTime() - days * DAY_MS);
    const [byDay, byFeature] = await Promise.all([this.repository.byDay(start, end), this.repository.byFeature(start, end)]);

    const keys: string[] = [];
    for (let at = start.getTime(); at < end.getTime(); at += DAY_MS) keys.push(istDayKey(new Date(at)));
    const daySeries = keys.map((day) => byDay.find((row) => row.day === day) ?? { day, calls: 0, failed: 0, fallback: 0, tokens: 0, cost: 0 });

    const rate = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10);
    const features = await Promise.all(
      byFeature.map(async (row) => ({
        ...row,
        cost: Math.round(row.cost * 100) / 100,
        errorRate: rate(row.failed, row.calls),
        fallbackRate: rate(row.fallback, row.calls),
        p95LatencyMs: percentile95(await this.repository.latencies(row.feature, start, end)),
      })),
    );

    const totals = daySeries.reduce(
      (sum, day) => ({ calls: sum.calls + day.calls, failed: sum.failed + day.failed, fallback: sum.fallback + day.fallback, tokens: sum.tokens + day.tokens, cost: sum.cost + day.cost }),
      { calls: 0, failed: 0, fallback: 0, tokens: 0, cost: 0 },
    );
    return {
      days: daySeries,
      features: features.sort((a, b) => b.calls - a.calls),
      totals: { ...totals, cost: Math.round(totals.cost * 100) / 100, errorRate: rate(totals.failed, totals.calls), fallbackRate: rate(totals.fallback, totals.calls) },
    };
  }

  /** Deletes logs past the retention period (job ai-call-log-cleanup). */
  async cleanup(now: Date = new Date()): Promise<{ deleted: number }> {
    const cutoff = new Date(now.getTime() - AI_CALL_LOG_RETENTION_DAYS * DAY_MS);
    return { deleted: await this.repository.deleteOlderThan(cutoff) };
  }
}
