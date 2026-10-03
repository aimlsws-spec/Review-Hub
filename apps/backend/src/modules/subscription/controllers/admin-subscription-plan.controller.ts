import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { FINANCE_ROLES } from '../../auth/constants';
import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto';
import { SubscriptionPlanAdminService } from '../services';

/** Plans and prices. Any admin can see them; only the finance team and super admins change them, since they set what merchants pay. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/subscription-plans', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminSubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanAdminService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Every plan, switched on or off, with how many merchants are on it' })
  async list() {
    return this.planService.list();
  }

  @Post()
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a plan (starts switched off unless isActive is sent)' })
  async create(@Body() dto: CreateSubscriptionPlanDto, @CurrentUser('id') adminId: string) {
    return this.planService.create(dto, adminId);
  }

  @Patch(':planId')
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a plan: price, benefits, or switch it on/off' })
  async update(@Param('planId') planId: string, @Body() dto: UpdateSubscriptionPlanDto, @CurrentUser('id') adminId: string) {
    return this.planService.update(planId, dto, adminId);
  }
}
