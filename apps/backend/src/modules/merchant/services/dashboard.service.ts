import { Injectable, NotFoundException } from '@nestjs/common';

import {
  MerchantCampaignStatsRepository,
  MerchantRepository,
  MerchantTeamRepository,
  MerchantWalletRepository,
} from '../repositories';

@Injectable()
export class DashboardService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly teamRepository: MerchantTeamRepository,
    private readonly walletRepository: MerchantWalletRepository,
    private readonly campaignStatsRepository: MerchantCampaignStatsRepository,
  ) {}

  async getDashboard(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const wallet = await this.walletRepository.findByMerchantId(merchantId);
    const teamMembers = await this.teamRepository.findByMerchantId(merchantId);
    const { totalCampaigns, activeCampaigns, totalBudget, spentBudget, totalParticipants } =
      await this.campaignStatsRepository.getStats(merchantId);

    return {
      totalCampaigns,
      activeCampaigns,
      totalParticipants,
      totalBudget: totalBudget.toString(),
      totalSpent: spentBudget.toString(),
      walletBalance: (wallet?.availableBalance ?? 0).toString(),
      pendingVerification: merchant.verificationStatus !== 'APPROVED',
      merchantStatus: merchant.status,
      // Richer detail beyond the headline stats, for callers that want it.
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        status: merchant.status,
        verificationStatus: merchant.verificationStatus,
        email: merchant.email,
        phone: merchant.phone,
      },
      wallet: wallet ? { availableBalance: wallet.availableBalance, reservedBalance: wallet.reservedBalance } : null,
      team: {
        totalMembers: teamMembers.length,
        members: teamMembers.slice(0, 5),
      },
    };
  }
}
