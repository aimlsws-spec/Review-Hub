import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { AddMessageDto, AssignTicketDto, TicketQueryDto, UpdateTicketStatusDto } from '../../support/dto';
import { SupportService } from '../../support/services';

@ApiTags(SWAGGER_TAGS.SUPPORT)
@Controller({ path: 'admin/support/tickets', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminSupportTicketController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all support tickets' })
  async list(@Query() query: TicketQueryDto) {
    return this.supportService.listAll(query);
  }

  @Get(':ticketId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a support ticket with its message thread' })
  async getOne(@Param('ticketId') ticketId: string) {
    return this.supportService.getForAdmin(ticketId);
  }

  @Post(':ticketId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply on a support ticket (optionally as an internal note)' })
  async reply(@Param('ticketId') ticketId: string, @CurrentUser('id') adminId: string, @Body() dto: AddMessageDto) {
    return this.supportService.replyAsAdmin(ticketId, adminId, dto);
  }

  @Patch(':ticketId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a support ticket\'s status' })
  async updateStatus(
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateStatus(ticketId, adminId, dto);
  }

  @Patch(':ticketId/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a support ticket to an admin' })
  async assign(
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assign(ticketId, adminId, dto);
  }
}
