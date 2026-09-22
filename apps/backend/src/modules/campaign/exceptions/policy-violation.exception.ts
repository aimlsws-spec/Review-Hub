import { HttpStatus } from '@nestjs/common';

import { AppException } from '@common/exceptions/app.exception';

import { WordingFinding } from '../policy/wording-policy';

export const CAMPAIGN_POLICY_VIOLATION = 'CAMPAIGN_POLICY_VIOLATION';

/** How many problems are named in the message; the full list is in `details.findings`. */
const NAMED_IN_MESSAGE = 3;

/**
 * A campaign's wording asks for, or rewards, a particular rating. It is a business-rule failure (422), not a
 * malformed request, and it carries every finding so a screen can point at the exact words.
 */
export class CampaignPolicyViolationException extends AppException {
  constructor(action: string, findings: WordingFinding[]) {
    const named = findings
      .slice(0, NAMED_IN_MESSAGE)
      .map((finding) => `"${finding.excerpt}" (${finding.field}): ${finding.message}`)
      .join(' ');
    const more = findings.length > NAMED_IN_MESSAGE ? ` And ${findings.length - NAMED_IN_MESSAGE} more.` : '';

    super({
      code: CAMPAIGN_POLICY_VIOLATION,
      message: `This campaign can not be ${action} yet. ${named}${more}`,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details: { findings },
    });
  }
}
