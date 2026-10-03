import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { SAVED_CAMPAIGNS_MAX } from '../constants';
import { CampaignRepository, SavedCampaignRepository } from '../repositories';

/**
 * The campaigns a person saved for later, kept on the server so the list follows them to another phone.
 *
 * Only a campaign people can currently see (active and public) can be saved. One saved earlier that has since ended is
 * kept in the list; the app drops it the first time it can not load it, the same way it did when saving was
 * phone-only.
 */
@Injectable()
export class SavedCampaignService {
  constructor(
    private readonly savedRepository: SavedCampaignRepository,
    private readonly campaignRepository: CampaignRepository,
  ) {}

  /** Newest first. */
  async list(userId: string): Promise<{ campaignIds: string[] }> {
    return { campaignIds: await this.savedRepository.findIdsByUser(userId) };
  }

  /** Saving twice is fine: the second time changes nothing. */
  async save(userId: string, campaignId: string): Promise<{ campaignIds: string[] }> {
    if (!(await this.savedRepository.exists(userId, campaignId))) {
      if (!(await this.campaignRepository.findPublicById(campaignId))) throw new NotFoundException('Campaign');
      if ((await this.savedRepository.countByUser(userId)) >= SAVED_CAMPAIGNS_MAX) {
        throw new BadRequestException(`You can save up to ${SAVED_CAMPAIGNS_MAX} campaigns. Remove one to save this.`);
      }
      await this.savedRepository.saveMany(userId, [campaignId]);
    }
    return this.list(userId);
  }

  /** Removing one that is not saved is fine too. */
  async remove(userId: string, campaignId: string): Promise<{ campaignIds: string[] }> {
    await this.savedRepository.remove(userId, campaignId);
    return this.list(userId);
  }

  /**
   * Uploads the list a phone kept locally before saving moved to the server, once. Campaigns that are no longer
   * visible are skipped rather than refused, and the list never grows past the limit: the newest ones win.
   */
  async import(userId: string, campaignIdsNewestFirst: string[]): Promise<{ campaignIds: string[] }> {
    const already = new Set(await this.savedRepository.findIdsByUser(userId));
    const room = Math.max(0, SAVED_CAMPAIGNS_MAX - already.size);
    const wanted = [...new Set(campaignIdsNewestFirst)].filter((id) => !already.has(id));

    const visible: string[] = [];
    for (const campaignId of wanted) {
      if (visible.length >= room) break;
      if (await this.campaignRepository.findPublicById(campaignId)) visible.push(campaignId);
    }
    await this.savedRepository.saveMany(userId, visible);
    return this.list(userId);
  }
}
