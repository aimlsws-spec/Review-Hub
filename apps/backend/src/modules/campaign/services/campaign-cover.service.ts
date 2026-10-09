import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { CAMPAIGN_COVER, EDITABLE_CAMPAIGN_STATUSES } from '../constants';
import { CampaignRepository } from '../repositories/campaign.repository';

/**
 * A campaign's cover image: the picture on its card in the app (thumbnailUrl) and at the top of its page (bannerUrl).
 * Stored under uploads/campaign, which is served publicly, as a path such as `/campaign/<uuid>.jpg`; the apps turn
 * that path into a full address.
 *
 * The cover can only change while the campaign can (draft or changes requested), so the admin sees the picture that
 * will run when they approve it. A replaced file is not deleted: a duplicated campaign shares its original's file.
 */
@Injectable()
export class CampaignCoverService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly storageService: LocalStorageService,
  ) {}

  /** Saves the picture (checked to really be a JPEG, PNG or WebP image) and makes it the campaign's cover. */
  async setCover(campaignId: string, file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Choose an image to upload');
    if (!CAMPAIGN_COVER.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('The cover image must be a JPEG, PNG or WebP picture', 'FILE_TYPE_NOT_ALLOWED');
    }
    if (file.size > CAMPAIGN_COVER.MAX_SIZE_BYTES) {
      throw new BadRequestException('The cover image can be at most 5 MB');
    }
    await this.getEditable(campaignId);

    // saveFile checks the bytes really are the claimed type and scans them before anything is written.
    const upload = await this.storageService.saveFile(file.buffer, file.originalname, CAMPAIGN_COVER.FOLDER, file.mimetype);
    return this.campaignRepository.update(campaignId, { thumbnailUrl: upload.path, bannerUrl: upload.path });
  }

  /** Takes the cover off; the app then shows its plain placeholder. */
  async removeCover(campaignId: string) {
    await this.getEditable(campaignId);
    return this.campaignRepository.update(campaignId, { thumbnailUrl: null, bannerUrl: null });
  }

  private async getEditable(campaignId: string) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    if (!EDITABLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
      throw new BadRequestException('The cover image can only be changed while the campaign is a draft or has changes requested');
    }
    return campaign;
  }
}
