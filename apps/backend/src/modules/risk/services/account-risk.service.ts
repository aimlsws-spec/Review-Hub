import { Injectable } from '@nestjs/common';
import { FraudRiskLevel } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { IP_LOOKBACK_DAYS } from '../constants';
import { AccountLinkageRepository } from '../repositories';

import { AccountLinkageService, LinkedAccount } from './account-linkage.service';
import { IpAssessment, IpReputationService } from './ip-reputation.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_IPS_SHOWN = 10;

export interface RecentIp extends IpAssessment {
  ip: string;
}

/** Everything known about how risky an account looks, in one place, for a reviewer to read. */
export interface AccountRiskReport {
  /** 0–100: the device's own risk plus the points from linked accounts, capped. */
  score: number;
  level: FraudRiskLevel;
  deviceRisk: number;
  linkPoints: number;
  linkedAccounts: LinkedAccount[];
  recentIps: RecentIp[];
}

/** How a 0–100 score maps to a level. */
export function riskLevelForScore(score: number): FraudRiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Brings the separate risk signals together: how risky the account's devices look, which other accounts it
 * is tied to, and whether it has been logging in from VPN or datacenter addresses. This is a report for a
 * person to read; automated decisions use the individual signals (a linked bank account holds a withdrawal,
 * a high-risk device holds one) rather than this blended number, so each action stays explainable.
 */
@Injectable()
export class AccountRiskService {
  constructor(
    private readonly repository: AccountLinkageRepository,
    private readonly linkage: AccountLinkageService,
    private readonly ipReputation: IpReputationService,
  ) {}

  async assess(userId: string): Promise<AccountRiskReport> {
    const [user] = await this.repository.userSummaries([userId]);
    if (!user) throw new NotFoundException('User');

    const since = new Date(Date.now() - IP_LOOKBACK_DAYS * DAY_MS);

    const [deviceRisk, linkage, ips] = await Promise.all([
      this.repository.maxDeviceRisk(userId),
      this.linkage.assess(userId),
      this.repository.recentIpsOf(userId, since, RECENT_IPS_SHOWN),
    ]);

    const score = Math.min(100, deviceRisk + linkage.points);

    return {
      score,
      level: riskLevelForScore(score),
      deviceRisk,
      linkPoints: linkage.points,
      linkedAccounts: linkage.accounts,
      recentIps: ips.map((ip) => ({ ip, ...this.ipReputation.assess(ip) })),
    };
  }
}
