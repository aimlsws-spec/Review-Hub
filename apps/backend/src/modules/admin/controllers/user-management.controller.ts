import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { PaginationQueryDto } from '@common/dto';
import { AdminRole, SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { UpdateUserStatusDto, UserQueryDto } from '../dto';
import { UserManagementService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List platform users' })
  async list(@Query() query: UserQueryDto) {
    return this.userManagementService.list(query);
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a user (admin view)' })
  async getById(@Param('userId') userId: string) {
    return this.userManagementService.getById(userId);
  }

  @Get(':userId/roles')
  @Roles(AdminRole.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a user's roles (super admin)" })
  async getRoles(@Param('userId') userId: string) {
    return this.userManagementService.getRoles(userId);
  }

  @Put(':userId/roles/:role')
  @Roles(AdminRole.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Give a staff role: ADMIN or FINANCE_TEAM (super admin)' })
  async grantRole(@Param('userId') userId: string, @Param('role') role: string, @CurrentUser('id') adminId: string) {
    return this.userManagementService.grantRole(userId, role, adminId);
  }

  @Delete(':userId/roles/:role')
  @Roles(AdminRole.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a staff role and sign the person out (super admin)' })
  async revokeRole(@Param('userId') userId: string, @Param('role') role: string, @CurrentUser('id') adminId: string) {
    return this.userManagementService.revokeRole(userId, role, adminId);
  }

  @Post(':userId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user' })
  async suspend(@Param('userId') userId: string, @Body() dto: UpdateUserStatusDto, @CurrentUser('id') adminId: string) {
    return this.userManagementService.suspend(userId, adminId, dto);
  }

  @Post(':userId/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user' })
  async ban(@Param('userId') userId: string, @Body() dto: UpdateUserStatusDto, @CurrentUser('id') adminId: string) {
    return this.userManagementService.ban(userId, adminId, dto);
  }

  @Post(':userId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended or banned user' })
  async reactivate(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    return this.userManagementService.reactivate(userId, adminId);
  }

  @Get(':userId/referrals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One level of the referral tree: who this user referred, and who referred them' })
  async getReferrals(@Param('userId') userId: string, @Query() query: PaginationQueryDto) {
    return this.userManagementService.getReferrals(userId, query.page, query.limit);
  }
}
