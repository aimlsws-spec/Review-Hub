import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions/app.exception';

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A campaign is submitted for review only when the merchant's wallet can pay its whole budget, so an admin never
 * approves a campaign that can not run. A business-rule failure (422) that says how much is missing, with the numbers
 * in `details` for a screen to show, and that nothing has been taken: the budget is only reserved on activation.
 */
export class CampaignBudgetNotCoveredException extends AppException {
  constructor(available: number, required: number) {
    const shortfall = Math.round((required - available) * 100) / 100;
    super({
      code: ERROR_CODES.CAMPAIGN_INSUFFICIENT_BUDGET,
      message:
        `Your wallet has ${rupees(available)} available, but this campaign's budget is ${rupees(required)}. ` +
        `Add ${rupees(shortfall)} to your wallet, then submit it again. ` +
        'Nothing is taken from your wallet until the campaign is approved and you activate it.',
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details: { available, required, shortfall },
    });
  }
}
