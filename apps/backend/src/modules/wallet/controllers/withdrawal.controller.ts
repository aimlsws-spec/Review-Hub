import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateWithdrawalDto, MarkWithdrawalFailedDto, MarkWithdrawalPaidDto, RejectWithdrawalDto } from '../dto';
import { WithdrawalService } from '../services';

@ApiTags(SWAGGER_TAGS.WITHDRAWALS)
@Controller({ path: 'withdrawals', version: '1' })
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a withdrawal' })
  async request(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWithdrawalDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.withdrawalService.request(userId, dto, deviceId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my withdrawal requests' })
  async listMine(@CurrentUser('id') userId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.withdrawalService.listMine(userId, Number(page), Number(limit));
  }

  @Get(':withdrawalId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one of my withdrawal requests' })
  async getMine(@Param('withdrawalId') withdrawalId: string, @CurrentUser('id') userId: string) {
    return this.withdrawalService.getMine(withdrawalId, userId);
  }

  @Post(':withdrawalId/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a withdrawal request (reviewer only)' })
  async approve(@Param('withdrawalId') withdrawalId: string, @CurrentUser('id') reviewerId: string) {
    return this.withdrawalService.approve(withdrawalId, reviewerId);
  }

  @Post(':withdrawalId/mark-paid')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record that the money was sent by bank transfer, with the bank reference (admin only). Each reference works once.' })
  async markPaid(
    @Param('withdrawalId') withdrawalId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: MarkWithdrawalPaidDto,
  ) {
    return this.withdrawalService.markPaid(withdrawalId, adminId, dto);
  }

  @Post(':withdrawalId/mark-failed')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record that the money could not be sent; it goes back to the user (admin only)' })
  async markFailed(
    @Param('withdrawalId') withdrawalId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: MarkWithdrawalFailedDto,
  ) {
    return this.withdrawalService.markFailed(withdrawalId, adminId, dto);
  }

  @Post(':withdrawalId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a withdrawal request (reviewer only)' })
  async reject(
    @Param('withdrawalId') withdrawalId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.withdrawalService.reject(withdrawalId, reviewerId, dto);
  }
}
