import { Logger, Module } from '@nestjs/common';

import { MerchantModule } from '../merchant/merchant.module';

import { CampaignController, MerchantCampaignController, PublicCampaignController } from './controllers';
import { CampaignOwnershipGuard } from './guards';
import { CampaignRepository } from './repositories';
import { CampaignService } from './services';

@Module({
  imports: [MerchantModule],
  controllers: [MerchantCampaignController, CampaignController, PublicCampaignController],
  providers: [CampaignService, CampaignRepository, CampaignOwnershipGuard],
  exports: [CampaignService, CampaignRepository, CampaignOwnershipGuard],
})
export class CampaignModule {
  private readonly logger = new Logger(CampaignModule.name);

  constructor() {
    this.logger.log('CampaignModule initialized');
  }
}
