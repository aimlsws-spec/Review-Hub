import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { AddMessageDto, CreateTicketDto, TicketQueryDto } from '../dto';
import { SupportService } from '../services';

@ApiTags(SWAGGER_TAGS.SUPPORT)
@Controller({ path: 'merchants/:merchantId/support/tickets', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class MerchantSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Open a support ticket as this merchant' })
  async create(@Param('merchantId') merchantId: string, @Body() dto: CreateTicketDto) {
    return this.supportService.createAsMerchant(merchantId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's support tickets" })
  async list(@Param('merchantId') merchantId: string, @Query() query: TicketQueryDto) {
    return this.supportService.listMineAsMerchant(merchantId, query);
  }

  @Get(':ticketId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one of this merchant\'s support tickets with its message thread' })
  async getOne(@Param('merchantId') merchantId: string, @Param('ticketId') ticketId: string) {
    return this.supportService.getForMerchant(ticketId, merchantId);
  }

  @Post(':ticketId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply on this merchant\'s support ticket' })
  async reply(
    @Param('merchantId') merchantId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.replyAsMerchant(ticketId, merchantId, userId, dto);
  }
}
