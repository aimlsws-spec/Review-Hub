import { Injectable } from '@nestjs/common';

import { IP_LOOKBACK_DAYS, IP_MAX_SHARING_ACCOUNTS, LINK_HOLD_POINTS, LINK_POINTS, LINK_POINTS_CAP, LINKED_ACCOUNTS_LIMIT } from '../constants';
import { AccountLinkageRepository } from '../repositories';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_IPS_CHECKED = 20;

/** The ways two accounts can be tied together, strongest evidence first. */
export type LinkKind = 'PAN' | 'BANK_ACCOUNT' | 'DEVICE' | 'IP';

/** Links that identify a person or a physical device, as opposed to a network many people share. */
export const STRONG_LINK_KINDS: readonly LinkKind[] = ['PAN', 'BANK_ACCOUNT', 'DEVICE'];

export interface LinkedAccount {
  userId: string;
  name: string;
  status: string;
  kinds: LinkKind[];
}

export interface LinkageAssessment {
  /** Sum of the points for every kind of link found, each kind capped. Compared against LINK_HOLD_POINTS. */
  points: number;
  holdRecommended: boolean;
  accounts: LinkedAccount[];
}

/**
 * Finds other accounts that look like the same person: the same PAN, the same bank account, the same
 * physical device, or (weakly) the same IP address. Someone running several accounts to collect the same
 * rewards more than once, or to pay out to one bank account, shows up here.
 */
@Injectable()
export class AccountLinkageService {
  constructor(private readonly repository: AccountLinkageRepository) {}

  async assess(userId: string): Promise<LinkageAssessment> {
    const scope = { excludeUserId: userId, limit: LINKED_ACCOUNTS_LIMIT };

    const [pan, bank, device, ip] = await Promise.all([
      this.repository.panNumbersOf(userId).then((numbers) => this.repository.usersSharingPan(numbers, scope)),
      this.repository.bankKeysOf(userId).then((keys) => this.repository.usersSharingBankAccounts(keys, scope)),
      this.repository.installIdsOf(userId).then((ids) => this.repository.usersSharingInstallIds(ids, scope)),
      this.sharedNetworkAccounts(userId),
    ]);

    const byKind: Record<LinkKind, string[]> = { PAN: pan, BANK_ACCOUNT: bank, DEVICE: device, IP: ip };

    const points = (Object.keys(byKind) as LinkKind[]).reduce(
      (sum, kind) => sum + Math.min(LINK_POINTS_CAP[kind], LINK_POINTS[kind] * byKind[kind].length),
      0,
    );

    return { points, holdRecommended: points >= LINK_HOLD_POINTS, accounts: await this.describe(byKind) };
  }

  /**
   * Whether two specific accounts are tied by a strong link. Used to stop a referral bonus being paid
   * between accounts that are really one person. Shared IPs do not count: friends and family share Wi-Fi.
   */
  async areLinked(userId: string, otherUserId: string): Promise<boolean> {
    if (userId === otherUserId) return true;
    const scope = { excludeUserId: userId, onlyUserId: otherUserId, limit: 1 };

    const [pan, bank, device] = await Promise.all([
      this.repository.panNumbersOf(userId).then((numbers) => this.repository.usersSharingPan(numbers, scope)),
      this.repository.bankKeysOf(userId).then((keys) => this.repository.usersSharingBankAccounts(keys, scope)),
      this.repository.installIdsOf(userId).then((ids) => this.repository.usersSharingInstallIds(ids, scope)),
    ]);
    return pan.length + bank.length + device.length > 0;
  }

  /**
   * Other accounts that logged in from the same IP recently. An address used by many accounts is a shared
   * network (an office, a campus, a mobile carrier, or our own proxy if the client IP is not being read
   * correctly), so it is ignored rather than linking hundreds of unrelated people.
   */
  private async sharedNetworkAccounts(userId: string): Promise<string[]> {
    const since = new Date(Date.now() - IP_LOOKBACK_DAYS * DAY_MS);
    const ips = await this.repository.recentIpsOf(userId, since, MAX_IPS_CHECKED);
    const accountsByIp = await this.repository.accountsByIp(ips, since);

    const others = new Set<string>();
    for (const accounts of accountsByIp.values()) {
      if (accounts.length > IP_MAX_SHARING_ACCOUNTS) continue;
      for (const account of accounts) if (account !== userId) others.add(account);
    }
    return [...others].slice(0, LINKED_ACCOUNTS_LIMIT);
  }

  private async describe(byKind: Record<LinkKind, string[]>): Promise<LinkedAccount[]> {
    const kindsByUser = new Map<string, LinkKind[]>();
    for (const kind of ['PAN', 'BANK_ACCOUNT', 'DEVICE', 'IP'] as const) {
      for (const id of byKind[kind]) kindsByUser.set(id, [...(kindsByUser.get(id) ?? []), kind]);
    }

    const summaries = await this.repository.userSummaries([...kindsByUser.keys()]);
    const accounts = summaries.map((user) => ({
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      status: user.status,
      kinds: kindsByUser.get(user.id) ?? [],
    }));

    // Strongest evidence first, so the most worrying account is at the top of the list.
    const strength = (account: LinkedAccount) => account.kinds.reduce((sum, kind) => sum + LINK_POINTS[kind], 0);
    return accounts.sort((a, b) => strength(b) - strength(a));
  }
}
