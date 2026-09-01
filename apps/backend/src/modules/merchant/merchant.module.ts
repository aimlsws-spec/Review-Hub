import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';

import {
  AdminMerchantController,
  CustomerController,
  MerchantController,
  PublicMerchantController,
  ReviewController,
} from './controllers';
import { MerchantListener, MerchantWalletListener } from './listeners';
import {
  CustomerRepository,
  MerchantBankRepository,
  MerchantCampaignStatsRepository,
  MerchantDocumentRepository,
  MerchantInvitationRepository,
  MerchantRepository,
  MerchantTeamRepository,
  MerchantWalletRepository,
  ReviewRepository,
} from './repositories';
import {
  AdminService,
  BankService,
  CustomerService,
  DashboardService,
  KycService,
  MerchantService,
  ReviewService,
  TeamService,
  WalletService,
} from './services';

@Module({
  imports: [AuthModule, PaymentModule],
  controllers: [
    MerchantController,
    PublicMerchantController,
    AdminMerchantController,
    ReviewController,
    CustomerController,
  ],
  providers: [
    MerchantService,
    KycService,
    TeamService,
    BankService,
    WalletService,
    DashboardService,
    AdminService,
    ReviewService,
    CustomerService,
    MerchantRepository,
    MerchantDocumentRepository,
    MerchantTeamRepository,
    MerchantInvitationRepository,
    MerchantBankRepository,
    MerchantWalletRepository,
    ReviewRepository,
    CustomerRepository,
    MerchantCampaignStatsRepository,
    MerchantListener,
    MerchantWalletListener,
  ],
  exports: [
    MerchantService,
    MerchantRepository,
    MerchantTeamRepository,
    MerchantWalletRepository,
  ],
})
export class MerchantModule {
  private readonly logger = new Logger(MerchantModule.name);

  constructor() {
    this.logger.log('MerchantModule initialized');
  }
}
