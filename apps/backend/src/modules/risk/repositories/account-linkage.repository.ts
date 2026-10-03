import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** A bank account as the linkage check compares it: the keyed hash of the number (never the number) and the IFSC. */
export interface BankKey {
  accountNumberHash: string;
  ifscCode: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

/** Narrows a "who else shares this?" lookup to one specific other user, for a yes/no question about two accounts. */
interface Scope {
  excludeUserId: string;
  onlyUserId?: string;
  limit: number;
}

const otherUsers = (scope: Scope) => (scope.onlyUserId ? { userId: scope.onlyUserId } : { userId: { not: scope.excludeUserId } });

/**
 * The lookups behind "which other accounts are connected to this one?". Each pair is the same shape: what
 * does this user have (an install id, a bank account, a PAN, an IP address), then who else has it.
 */
@Injectable()
export class AccountLinkageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Same physical device (needs the app to send a stable install id) ──────

  async installIdsOf(userId: string): Promise<string[]> {
    const devices = await this.prisma.device.findMany({
      where: { userId, installId: { not: null } },
      distinct: ['installId'],
      select: { installId: true },
    });
    return devices.map((d) => d.installId as string);
  }

  async usersSharingInstallIds(installIds: string[], scope: Scope): Promise<string[]> {
    if (installIds.length === 0) return [];
    const rows = await this.prisma.device.findMany({
      where: { installId: { in: installIds }, ...otherUsers(scope) },
      distinct: ['userId'],
      select: { userId: true },
      take: scope.limit,
    });
    return rows.map((r) => r.userId);
  }

  // ── Same bank account ─────────────────────────────────────────────────────

  /** Rows written before encryption have no hash until the backfill runs; they are simply not compared until then. */
  async bankKeysOf(userId: string): Promise<BankKey[]> {
    const rows = await this.prisma.userBankAccount.findMany({
      where: { userId, deletedAt: null, accountNumberHash: { not: null } },
      select: { accountNumberHash: true, ifscCode: true },
    });
    return rows.map((r) => ({ accountNumberHash: r.accountNumberHash as string, ifscCode: r.ifscCode }));
  }

  async usersSharingBankAccounts(keys: BankKey[], scope: Scope): Promise<string[]> {
    if (keys.length === 0) return [];
    const rows = await this.prisma.userBankAccount.findMany({
      where: { deletedAt: null, ...otherUsers(scope), OR: keys.map((k) => ({ accountNumberHash: k.accountNumberHash, ifscCode: k.ifscCode })) },
      distinct: ['userId'],
      select: { userId: true },
      take: scope.limit,
    });
    return rows.map((r) => r.userId);
  }

  // ── Same PAN ──────────────────────────────────────────────────────────────

  /** Keyed hashes of the user's PANs: the numbers themselves are encrypted, and equal numbers have equal hashes. */
  async panNumbersOf(userId: string): Promise<string[]> {
    const documents = await this.prisma.userKycDocument.findMany({
      where: { userId, documentType: 'PAN', deletedAt: null, documentNumberHash: { not: null } },
      select: { documentNumberHash: true },
    });
    return documents.map((d) => d.documentNumberHash as string);
  }

  /** `hashes` as panNumbersOf returns them. */
  async usersSharingPan(hashes: string[], scope: Scope): Promise<string[]> {
    if (hashes.length === 0) return [];
    const rows = await this.prisma.userKycDocument.findMany({
      where: { documentType: 'PAN', deletedAt: null, documentNumberHash: { in: hashes }, ...otherUsers(scope) },
      distinct: ['userId'],
      select: { userId: true },
      take: scope.limit,
    });
    return rows.map((r) => r.userId);
  }

  // ── Same IP address (weak: households, offices and mobile carriers share them) ──

  async recentIpsOf(userId: string, since: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.loginHistory.findMany({
      where: { userId, isSuccess: true, ipAddress: { not: null }, loginAt: { gte: since } },
      orderBy: { loginAt: 'desc' },
      distinct: ['ipAddress'],
      select: { ipAddress: true },
      take: limit,
    });
    return rows.map((r) => r.ipAddress as string);
  }

  /** For each IP, every account that logged in from it recently (the caller included). */
  async accountsByIp(ips: string[], since: Date): Promise<Map<string, string[]>> {
    const byIp = new Map<string, string[]>();
    if (ips.length === 0) return byIp;

    const pairs = await this.prisma.loginHistory.groupBy({
      by: ['ipAddress', 'userId'],
      where: { ipAddress: { in: ips }, isSuccess: true, loginAt: { gte: since } },
    });
    for (const { ipAddress, userId } of pairs) {
      if (!ipAddress) continue;
      byIp.set(ipAddress, [...(byIp.get(ipAddress) ?? []), userId]);
    }
    return byIp;
  }

  // ── Supporting lookups ────────────────────────────────────────────────────

  /** The worst risk score across this user's active devices (0 when they have none). */
  async maxDeviceRisk(userId: string): Promise<number> {
    const result = await this.prisma.device.aggregate({ where: { userId, isActive: true }, _max: { riskScore: true } });
    return result._max.riskScore ?? 0;
  }

  async userSummaries(ids: string[]): Promise<UserSummary[]> {
    if (ids.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, status: true },
    });
  }

  /** Which of these users have joined this campaign. */
  async participantsInCampaign(campaignId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.campaignParticipant.findMany({
      where: { campaignId, userId: { in: userIds } },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }
}
