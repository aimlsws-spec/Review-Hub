import { Logger, Module } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';

import { ReferralController } from './controllers';
import { ReferralListener } from './listeners';
import { ReferralRepository } from './repositories';
import { ReferralService } from './services';

@Module({
  imports: [WalletModule],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralListener, ReferralRepository],
  exports: [ReferralService, ReferralRepository],
})
export class ReferralModule {
  private readonly logger = new Logger(ReferralModule.name);

  constructor() {
    this.logger.log('ReferralModule initialized');
  }
}
