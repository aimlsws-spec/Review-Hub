import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { DisputeQueryDto } from '../../task/dto/dispute-query.dto';
import { ResolveDisputeDto } from '../../task/dto/resolve-dispute.dto';
import { DisputeService } from '../../task/services/dispute.service';

@ApiTags('Admin - Disputes')
@Controller({ path: 'admin/disputes', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminDisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List disputes' })
  async listDisputes(@Query() query: DisputeQueryDto) {
    return this.disputeService.getAdminDisputes(query);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a dispute' })
  async resolveDispute(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(id, reviewerId, dto);
  }
}
