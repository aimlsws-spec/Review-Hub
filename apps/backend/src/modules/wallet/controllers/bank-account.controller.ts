import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { AddUserBankDto, UpdateUserBankDto } from '../dto';
import { BankAccountService } from '../services';

@ApiTags(SWAGGER_TAGS.WALLET)
@Controller({ path: 'wallet/bank-accounts', version: '1' })
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a bank account for payouts' })
  async create(@CurrentUser('id') userId: string, @Body() dto: AddUserBankDto) {
    return this.bankAccountService.addBankAccount(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my bank accounts' })
  async list(@CurrentUser('id') userId: string) {
    return this.bankAccountService.getBankAccounts(userId);
  }

  @Patch(':bankId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a bank account' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('bankId') bankId: string,
    @Body() dto: UpdateUserBankDto,
  ) {
    return this.bankAccountService.updateBankAccount(userId, bankId, dto);
  }

  @Delete(':bankId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a bank account' })
  async remove(@CurrentUser('id') userId: string, @Param('bankId') bankId: string) {
    return this.bankAccountService.deleteBankAccount(userId, bankId);
  }
}
