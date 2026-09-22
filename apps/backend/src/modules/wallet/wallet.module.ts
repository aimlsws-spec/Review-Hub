import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';
import { PaymentModule } from '../payment/payment.module';
import { RiskModule } from '../risk/risk.module';
import { UserKycModule } from '../user-kyc/user-kyc.module';

import { AdminTdsController, BankAccountController, MerchantRewardController, WalletController, WithdrawalController } from './controllers';
import { PayoutListener, RewardListener } from './listeners';
import {
  RewardRepository,
  UserBankAccountRepository,
  UserWalletRepository,
  WithdrawalRepository,
  WithdrawalSettlementRepository,
} from './repositories';
import { BankAccountService, TdsReportService, WalletService, WithdrawalPolicyService, WithdrawalService } from './services';

@Module({
  imports: [AuthModule, MerchantModule, PaymentModule, UserKycModule, RiskModule],
  controllers: [WalletController, BankAccountController, WithdrawalController, MerchantRewardController, AdminTdsController],
  providers: [
    WalletService,
    BankAccountService,
    WithdrawalService,
    RewardListener,
    PayoutListener,
    UserWalletRepository,
    WithdrawalSettlementRepository,
    WithdrawalPolicyService,
    TdsReportService,
    RewardRepository,
    UserBankAccountRepository,
    WithdrawalRepository,
  ],
  exports: [WalletService, UserWalletRepository, RewardRepository, WithdrawalService, WithdrawalRepository],
})
export class WalletModule {
  private readonly logger = new Logger(WalletModule.name);

  constructor() {
    this.logger.log('WalletModule initialized');
  }
}
