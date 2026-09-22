import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { AccountRiskService } from '../../risk/services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/risk', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AccountRiskController {
  constructor(private readonly accountRiskService: AccountRiskService) {}

  @Get('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "How risky a user's account looks: device risk, linked accounts and the reputation of recent IP addresses" })
  async getUserRisk(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.accountRiskService.assess(userId);
  }
}
