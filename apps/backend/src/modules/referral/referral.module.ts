import { Logger, Module } from '@nestjs/common';

import { AppConfigModule } from '../app-config/app-config.module';
import { RiskModule } from '../risk/risk.module';
import { WalletModule } from '../wallet/wallet.module';

import { InviteController, ReferralController } from './controllers';
import { ReferralListener } from './listeners';
import { ReferralRepository } from './repositories';
import { InviteService, ReferralService } from './services';

@Module({
  imports: [WalletModule, RiskModule, AppConfigModule],
  controllers: [ReferralController, InviteController],
  providers: [ReferralService, InviteService, ReferralListener, ReferralRepository],
  exports: [ReferralService, ReferralRepository],
})
export class ReferralModule {
  private readonly logger = new Logger(ReferralModule.name);

  constructor() {
    this.logger.log('ReferralModule initialized');
  }
}
