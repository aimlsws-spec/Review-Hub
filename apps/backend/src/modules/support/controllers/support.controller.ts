import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { AddMessageDto, CreateTicketDto, TicketQueryDto } from '../dto';
import { SupportService } from '../services';

@ApiTags(SWAGGER_TAGS.SUPPORT)
@Controller({ path: 'support/tickets', version: '1' })
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Open a support ticket' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTicketDto) {
    return this.supportService.createAsUser(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my support tickets' })
  async listMine(@CurrentUser('id') userId: string, @Query() query: TicketQueryDto) {
    return this.supportService.listMineAsUser(userId, query);
  }

  @Get(':ticketId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one of my support tickets with its message thread' })
  async getMine(@Param('ticketId') ticketId: string, @CurrentUser('id') userId: string) {
    return this.supportService.getForUser(ticketId, userId);
  }

  @Post(':ticketId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply on one of my support tickets' })
  async reply(
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.replyAsUser(ticketId, userId, dto);
  }
}
