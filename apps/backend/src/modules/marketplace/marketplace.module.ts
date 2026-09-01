import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';

import { AdminMarketplaceController, MarketplaceController } from './controllers';
import { MarketplaceItemRepository, RedemptionRepository } from './repositories';
import { MarketplaceItemAdminService, MarketplaceService } from './services';

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [MarketplaceController, AdminMarketplaceController],
  providers: [MarketplaceService, MarketplaceItemAdminService, MarketplaceItemRepository, RedemptionRepository],
  exports: [MarketplaceService],
})
export class MarketplaceModule {
  private readonly logger = new Logger(MarketplaceModule.name);

  constructor() {
    this.logger.log('MarketplaceModule initialized');
  }
}
