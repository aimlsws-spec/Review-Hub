import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { GenerateSettlementDto, SettlementQueryDto } from '../dto';
import { SettlementRepository } from '../repositories';
import { SettlementService } from '../services';

/** Admin visibility into + manual trigger for the nightly settlement job — useful for testing and for backfilling a missed run. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/settlements', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminSettlementController {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly settlementRepository: SettlementRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List settlements across all merchants' })
  async list(@Query() query: SettlementQueryDto) {
    return this.settlementRepository.findAll(query.page, query.limit);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate settlements + invoices for a period (defaults to the prior UTC day)' })
  async generate(@Body() dto: GenerateSettlementDto) {
    if (dto.periodStart && dto.periodEnd) {
      return this.settlementService.generateForPeriod(new Date(dto.periodStart), new Date(dto.periodEnd));
    }
    return this.settlementService.generateForPreviousDay();
  }
}
