import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { PaymentSimulationGuard } from '../../payment/guards';
import { RewardQueryDto, WalletTransactionExportQueryDto, WalletTransactionQueryDto } from '../dto';
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

  @Get('transactions/export')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download my wallet history as a CSV statement, under the same filter as the list' })
  async exportTransactions(@CurrentUser('id') userId: string, @Query() query: WalletTransactionExportQueryDto, @Res() res: Response) {
    const { filename, content, truncated } = await this.walletService.exportTransactionsCsv(userId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Tells the app the file stops short, so it can say so instead of presenting a partial history as complete.
    res.setHeader('X-Export-Truncated', String(truncated));
    res.setHeader('Access-Control-Expose-Headers', 'X-Export-Truncated, Content-Disposition');
    res.send(content);
  }

  @Get('rewards')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my task rewards' })
  async getRewards(@CurrentUser('id') userId: string, @Query() query: RewardQueryDto) {
    return this.walletService.getMyRewards(userId, query);
  }

  @Post('simulate-add-funds')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PaymentSimulationGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MOCK] Add funds to user wallet for testing' })
  async simulateAddFunds(@CurrentUser('id') userId: string, @Body('amount') amount: number) {
    return this.walletService.simulateAddFunds(userId, amount);
  }
}
