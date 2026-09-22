import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IpListSpec } from '../../../config/envs/risk.config';
import { CidrSet, isPrivateIp, parseIp } from '../utils/cidr.util';

/**
 * PRIVATE     a private or local address (a developer's machine, or a proxy hop): says nothing about the user.
 * ANONYMIZER  listed as a VPN, proxy, Tor or datacenter address.
 * CLEAN       checked against real data and not listed.
 * UNKNOWN     no address, or no reputation data is configured, so nothing can be said either way.
 */
export type IpVerdict = 'PRIVATE' | 'ANONYMIZER' | 'CLEAN' | 'UNKNOWN';

export interface IpAssessment {
  verdict: IpVerdict;
  /** Which lists matched, e.g. ["vpn", "watch-list"]. */
  sources: string[];
}

const FETCH_TIMEOUT_MS = 20_000;
/** A plain-text CIDR list is a few MB at most; anything much bigger is not what we asked for. */
const MAX_LIST_BYTES = 30 * 1024 * 1024;
const WATCH_LIST_NAME = 'watch-list';

/**
 * Tells whether an IP address belongs to a VPN, proxy, Tor exit or datacenter, using free public lists you
 * choose (IP_REPUTATION_LISTS) plus your own extra ranges (IP_REPUTATION_EXTRA_CIDRS). Nothing is called per
 * request: the lists are downloaded in the background, held in memory and refreshed on a timer, so a check
 * costs microseconds and keeps working if a list source goes down (the last good copy is kept).
 *
 * With nothing configured every address is UNKNOWN and callers behave as they did before this existed,
 * the same graceful degradation as Firebase, SMTP and OCR.
 */
@Injectable()
export class IpReputationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IpReputationService.name);
  private readonly lists = new Map<string, CidrSet>();
  private watchList = new CidrSet();
  private specs: IpListSpec[] = [];
  private timer?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.specs = this.config.get<IpListSpec[]>('risk.ipLists', []);
    this.watchList = CidrSet.fromEntries(this.config.get<string[]>('risk.ipExtraCidrs', []));

    if (this.specs.length === 0) {
      this.logger.log(
        this.watchList.size > 0
          ? `IP reputation: using ${this.watchList.size} configured range(s) only (no downloadable lists set)`
          : 'IP reputation not configured (IP_REPUTATION_LISTS / IP_REPUTATION_EXTRA_CIDRS) — every address reports UNKNOWN',
      );
      return;
    }

    // Do not hold up app start-up on a slow download; addresses report UNKNOWN until the first list arrives.
    void this.refresh();
    const hours = this.config.get<number>('risk.ipRefreshHours', 24);
    this.timer = setInterval(() => void this.refresh(), hours * 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Downloads every configured list. A list that fails keeps its previous contents; it never wipes what worked. */
  async refresh(): Promise<void> {
    for (const spec of this.specs) {
      try {
        const response = await fetch(spec.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        if (text.length > MAX_LIST_BYTES) throw new Error('list is unexpectedly large');

        const set = CidrSet.fromText(text);
        // An empty result is a bad download (an error page, a changed format), not a real list of nothing.
        if (set.size === 0) throw new Error('no valid ranges found');

        this.lists.set(spec.name, set);
        this.logger.log(`IP reputation list "${spec.name}" loaded: ${set.size} ranges`);
      } catch (error) {
        this.logger.warn(
          `IP reputation list "${spec.name}" could not be refreshed (${error instanceof Error ? error.message : String(error)}); keeping the previous copy`,
        );
      }
    }
  }

  /** True once at least one source can give a real answer. */
  get hasData(): boolean {
    return this.lists.size > 0 || this.watchList.size > 0;
  }

  assess(ip: string | null | undefined): IpAssessment {
    if (!ip) return { verdict: 'UNKNOWN', sources: [] };

    const parsed = parseIp(ip);
    if (!parsed) return { verdict: 'UNKNOWN', sources: [] };
    if (isPrivateIp(ip)) return { verdict: 'PRIVATE', sources: [] };
    if (!this.hasData) return { verdict: 'UNKNOWN', sources: [] };

    const sources: string[] = [];
    if (this.watchList.contains(parsed)) sources.push(WATCH_LIST_NAME);
    for (const [name, set] of this.lists) if (set.contains(parsed)) sources.push(name);

    return sources.length > 0 ? { verdict: 'ANONYMIZER', sources } : { verdict: 'CLEAN', sources: [] };
  }

  isAnonymizer(ip: string | null | undefined): boolean {
    return this.assess(ip).verdict === 'ANONYMIZER';
  }
}
