import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { RewardQueryDto, WalletTransactionQueryDto } from '../dto';
import { WalletService } from '../services';

@ApiTags(SWAGGER_TAGS.WALLET)
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet balance' })
  async getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet transaction history' })
  async getTransactions(@CurrentUser('id') userId: string, @Query() query: WalletTransactionQueryDto) {
    return this.walletService.getTransactions(userId, query);
  }

  @Get('rewards')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my task rewards' })
  async getRewards(@CurrentUser('id') userId: string, @Query() query: RewardQueryDto) {
    return this.walletService.getMyRewards(userId, query);
  }
}
