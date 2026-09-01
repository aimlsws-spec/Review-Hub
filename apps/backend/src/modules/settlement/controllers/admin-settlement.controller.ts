import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { GenerateSettlementDto } from '../dto';
import { SettlementService } from '../services';

/** Manual trigger for the nightly settlement job — useful for testing and for backfilling a missed run. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/settlements', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminSettlementController {
  constructor(private readonly settlementService: SettlementService) {}

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
