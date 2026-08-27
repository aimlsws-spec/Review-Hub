import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { CampaignRepository } from '../repositories';

/**
 * Resolves the campaign's owning merchant and checks that the current user
 * is either the merchant owner or a member of the merchant's team, mirroring
 * MerchantOwnershipGuard's checks but keyed off :campaignId instead of :merchantId.
 */
@Injectable()
export class CampaignOwnershipGuard implements CanActivate {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly merchantRepository: MerchantRepository,
    private readonly teamRepository: MerchantTeamRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const campaignId = request.params.campaignId;
    if (!campaignId) return false;

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundException('Campaign');

    const merchant = await this.merchantRepository.findById(campaign.merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const isOwner = merchant.userId === user.id;
    if (!isOwner) {
      const teamMember = await this.teamRepository.findByMerchantAndUser(campaign.merchantId, user.id);
      if (!teamMember) return false;
    }

    request.campaign = campaign;
    request.merchant = merchant;
    return true;
  }
}
