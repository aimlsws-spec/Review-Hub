import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

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
}
