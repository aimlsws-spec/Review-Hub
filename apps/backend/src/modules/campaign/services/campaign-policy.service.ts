import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { CampaignPolicyViolationException } from '../exceptions/policy-violation.exception';
import { blockingFindings, evaluateWording, WordingFinding, WordingInput } from '../policy/wording-policy';

/** The parts of a campaign whose wording is checked. */
export interface PolicyCampaign {
  id: string;
  title: string;
  shortDescription?: string | null;
  description: string;
}

export interface WordingCheck {
  /** False when at least one finding stops the campaign being submitted or approved. */
  allowed: boolean;
  findings: WordingFinding[];
}

/**
 * Applies the honest-feedback wording policy to real campaigns: the campaign's own text and the text of every task
 * in it. The rules themselves live in `policy/wording-policy.ts`; this class only gathers the text and decides what
 * happens with the result.
 *
 * Blocking findings stop a campaign being submitted or approved. Lesser findings are shown to the admin who
 * reviews it and never stop anything, so an honest campaign is not held up by a cautious rule.
 */
@Injectable()
export class CampaignPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Checks some text without touching the database, for a form that wants to warn while someone types. */
  check(inputs: WordingInput[]): WordingCheck {
    const findings = evaluateWording(inputs);
    return { allowed: blockingFindings(findings).length === 0, findings };
  }

  /** Throws unless this text is allowed. Used for wording that is not a whole campaign, such as an offer line. */
  assertAllowed(inputs: WordingInput[], action: string): void {
    const blocking = blockingFindings(evaluateWording(inputs));
    if (blocking.length > 0) throw new CampaignPolicyViolationException(action, blocking);
  }

  async findingsForCampaign(campaign: PolicyCampaign): Promise<WordingFinding[]> {
    const map = await this.findingsForCampaigns([campaign]);
    return map.get(campaign.id) ?? [];
  }

  /** Findings for several campaigns with one query for all their tasks, so a page of the admin queue stays cheap. */
  async findingsForCampaigns(campaigns: PolicyCampaign[]): Promise<Map<string, WordingFinding[]>> {
    const result = new Map<string, WordingFinding[]>();
    if (campaigns.length === 0) return result;

    const tasks = await this.prisma.campaignTask.findMany({
      where: { campaignId: { in: campaigns.map((c) => c.id) }, deletedAt: null },
      select: { campaignId: true, title: true, description: true, instructions: true },
    });

    for (const campaign of campaigns) {
      const inputs: WordingInput[] = [
        { field: 'title', text: campaign.title },
        { field: 'short description', text: campaign.shortDescription },
        { field: 'description', text: campaign.description },
      ];
      for (const task of tasks.filter((t) => t.campaignId === campaign.id)) {
        inputs.push(
          { field: `task "${task.title}" title`, text: task.title },
          { field: `task "${task.title}" description`, text: task.description },
          { field: `task "${task.title}" instructions`, text: task.instructions },
        );
      }
      result.set(campaign.id, evaluateWording(inputs));
    }
    return result;
  }

  /** Throws a policy violation naming the words, if anything in the campaign blocks it. */
  async assertCampaignAllowed(campaign: PolicyCampaign, action: 'submitted' | 'approved'): Promise<void> {
    const blocking = blockingFindings(await this.findingsForCampaign(campaign));
    if (blocking.length > 0) throw new CampaignPolicyViolationException(action, blocking);
  }
}
