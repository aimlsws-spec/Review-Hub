import { Injectable, Logger } from '@nestjs/common';

import { CampaignRepository } from '../repositories';

import { CampaignService } from './campaign.service';

/** How many campaigns one run moves at most, per kind. The rest are picked up by the next run, five minutes later. */
const BATCH = 200;

/**
 * Moves campaigns along their own dates: a scheduled campaign goes live when its start time comes, and one past its
 * end date expires, which hands its unspent budget back to the merchant's wallet. Runs every few minutes as the
 * `campaign-schedule` platform job.
 *
 * Safe to run again at any time: each campaign goes through CampaignService's normal status change, which refuses a
 * move the campaign has already made, so a campaign started or expired by an earlier run (or by the merchant) is
 * simply skipped.
 */
@Injectable()
export class CampaignScheduleService {
  private readonly logger = new Logger(CampaignScheduleService.name);

  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignService: CampaignService,
  ) {}

  async run(now = new Date()): Promise<{ started: number; expired: number; failed: number }> {
    const counts = { started: 0, expired: 0, failed: 0 };

    // Expiry first: a campaign whose start and end have both passed while it waited must end, not start.
    for (const { id } of await this.campaignRepository.findPastEnd(now, BATCH)) {
      if (await this.attempt(id, 'expire', () => this.campaignService.expire(id))) counts.expired++;
      else counts.failed++;
    }
    for (const { id } of await this.campaignRepository.findDueToStart(now, BATCH)) {
      if (await this.attempt(id, 'start', () => this.campaignService.startScheduled(id))) counts.started++;
      else counts.failed++;
    }

    if (counts.started || counts.expired || counts.failed) {
      this.logger.log(`Campaign schedule: ${counts.started} started, ${counts.expired} expired, ${counts.failed} failed`);
    }
    return counts;
  }

  /** One campaign's move. A failure is logged and left for the next run; it never stops the others. */
  private async attempt(campaignId: string, action: string, move: () => Promise<unknown>): Promise<boolean> {
    try {
      await move();
      return true;
    } catch (error) {
      this.logger.warn(`Could not ${action} campaign ${campaignId}: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }
}
