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
import { MerchantListener, MerchantRefundPayoutListener, MerchantWalletListener } from './listeners';
import {
  CustomerRepository,
  MerchantBankRepository,
  MerchantCampaignStatsRepository,
  MerchantDocumentRepository,
  MerchantInvitationRepository,
  MerchantRefundRepository,
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
  RefundService,
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
    RefundService,
    MerchantRepository,
    MerchantDocumentRepository,
    MerchantTeamRepository,
    MerchantInvitationRepository,
    MerchantBankRepository,
    MerchantWalletRepository,
    MerchantRefundRepository,
    ReviewRepository,
    CustomerRepository,
    MerchantCampaignStatsRepository,
    MerchantListener,
    MerchantWalletListener,
    MerchantRefundPayoutListener,
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
