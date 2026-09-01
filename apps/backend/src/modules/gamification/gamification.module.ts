import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';

import { AdminBadgeController, AdminDailyRewardPrizeController, GamificationController } from './controllers';
import { GamificationListener } from './listeners';
import { BadgeRepository, DailyRewardClaimRepository, DailyRewardPrizeRepository, GamificationProfileRepository } from './repositories';
import { BadgeAdminService, DailyRewardPrizeAdminService, DailyRewardService, GamificationService } from './services';

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [GamificationController, AdminBadgeController, AdminDailyRewardPrizeController],
  providers: [
    GamificationService,
    BadgeAdminService,
    DailyRewardService,
    DailyRewardPrizeAdminService,
    GamificationListener,
    GamificationProfileRepository,
    BadgeRepository,
    DailyRewardPrizeRepository,
    DailyRewardClaimRepository,
  ],
  exports: [GamificationService],
})
export class GamificationModule {
  private readonly logger = new Logger(GamificationModule.name);

  constructor() {
    this.logger.log('GamificationModule initialized');
  }
}
