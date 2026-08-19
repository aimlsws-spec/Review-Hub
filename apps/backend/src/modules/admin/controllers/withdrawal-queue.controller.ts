import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { WithdrawalService } from '../../wallet/services';

/**
 * Approve/reject stay on the wallet module's own /withdrawals/:id/approve|reject
 * endpoints (already role-gated there) — this only adds the admin-facing queue
 * view, so fund-moving logic isn't duplicated across two controllers.
 */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/withdrawals', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminWithdrawalQueueController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List withdrawal requests awaiting review' })
  async listPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.withdrawalService.listPendingForAdmin(Number(page), Number(limit));
  }
}
