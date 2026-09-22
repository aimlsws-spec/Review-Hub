import { Injectable, Logger } from '@nestjs/common';
import { FraudRiskLevel } from '@prisma/client';

import { AccountLinkageRepository, SubmissionSignalRepository } from '../repositories';

import { AccountLinkageService, LinkKind, STRONG_LINK_KINDS } from './account-linkage.service';
import { IpReputationService } from './ip-reputation.service';

/** Identity-level links (PAN, bank account) are near-proof of one person; a shared phone is only suggestive. */
const IDENTITY_KINDS: readonly LinkKind[] = ['PAN', 'BANK_ACCOUNT'];

/**
 * Checks a new submission's surroundings, rather than its picture: where it was sent from, and whether the
 * person is quietly working the same campaign from several accounts. Findings become flags on the submission,
 * where reviewers already look.
 */
@Injectable()
export class SubmissionRiskService {
  private readonly logger = new Logger(SubmissionRiskService.name);

  constructor(
    private readonly ipReputation: IpReputationService,
    private readonly linkage: AccountLinkageService,
    private readonly repository: AccountLinkageRepository,
    private readonly signals: SubmissionSignalRepository,
  ) {}

  async assess(params: { submissionId: string; userId: string; campaignId: string; ip?: string }): Promise<void> {
    await this.flagAnonymizedNetwork(params);
    await this.flagLinkedAccountsOnSameCampaign(params);
  }

  /**
   * Submitting from a VPN, proxy, Tor or datacenter address is a reason to look, not a reason to refuse: plenty
   * of honest people use a VPN. So it is only ever a MEDIUM note, which never holds a reward on its own.
   */
  private async flagAnonymizedNetwork(params: { submissionId: string; userId: string; ip?: string }): Promise<void> {
    const assessment = this.ipReputation.assess(params.ip);
    if (assessment.verdict !== 'ANONYMIZER') return;

    await this.signals.createFlag({
      submissionId: params.submissionId,
      userId: params.userId,
      type: 'VPN_DETECTED',
      riskLevel: 'MEDIUM',
      reason: `Submitted from an address listed as a VPN, proxy or datacenter (${assessment.sources.join(', ')})`,
      metadata: { ip: params.ip as string, sources: assessment.sources },
    });
  }

  /**
   * When this user is tied to other accounts that have also joined the same campaign, one person may be
   * collecting the reward several times. Same PAN or bank account is HIGH (a person must look before it is
   * paid); the same phone alone is MEDIUM, since families share phones.
   */
  private async flagLinkedAccountsOnSameCampaign(params: { submissionId: string; userId: string; campaignId: string }): Promise<void> {
    const { accounts } = await this.linkage.assess(params.userId);
    const strong = accounts.filter((account) => account.kinds.some((kind) => STRONG_LINK_KINDS.includes(kind)));
    if (strong.length === 0) return;

    const joined = new Set(await this.repository.participantsInCampaign(params.campaignId, strong.map((account) => account.userId)));
    const alsoInCampaign = strong.filter((account) => joined.has(account.userId));
    if (alsoInCampaign.length === 0) return;

    const isIdentityLink = alsoInCampaign.some((account) => account.kinds.some((kind) => IDENTITY_KINDS.includes(kind)));
    const riskLevel: FraudRiskLevel = isIdentityLink ? 'HIGH' : 'MEDIUM';

    await this.signals.createFlag({
      submissionId: params.submissionId,
      userId: params.userId,
      type: 'MULTIPLE_ACCOUNTS',
      riskLevel,
      reason: isIdentityLink
        ? 'This account shares a PAN or bank account with another account in the same campaign'
        : 'This account shares a device with another account in the same campaign',
      metadata: { linkedUserIds: alsoInCampaign.map((account) => account.userId), linkKinds: [...new Set(alsoInCampaign.flatMap((account) => account.kinds))] },
    });

    this.logger.warn(`Submission ${params.submissionId}: ${alsoInCampaign.length} linked account(s) in campaign ${params.campaignId} (${riskLevel})`);
  }
}
