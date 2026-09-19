import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CampaignModule } from '../campaign/campaign.module';
import { TaskModule } from '../task/task.module';
import { WalletModule } from '../wallet/wallet.module';

import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [AuthModule, CampaignModule, WalletModule, TaskModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
