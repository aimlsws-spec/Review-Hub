import { Logger, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';
import { PaymentModule } from '../payment/payment.module';

import { BankAccountController, MerchantRewardController, WalletController, WithdrawalController } from './controllers';
import { PayoutListener, RewardListener } from './listeners';
import { RewardRepository, UserBankAccountRepository, UserWalletRepository, WithdrawalRepository } from './repositories';
import { BankAccountService, WalletService, WithdrawalService } from './services';

@Module({
  imports: [AuthModule, MerchantModule, PaymentModule],
  controllers: [WalletController, BankAccountController, WithdrawalController, MerchantRewardController],
  providers: [
    WalletService,
    BankAccountService,
    WithdrawalService,
    RewardListener,
    PayoutListener,
    UserWalletRepository,
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
