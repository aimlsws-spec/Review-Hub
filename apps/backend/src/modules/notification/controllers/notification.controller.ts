import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { NotificationQueryDto, UpdatePreferencesDto } from '../dto';
import { NotificationService } from '../services';

@ApiTags(SWAGGER_TAGS.NOTIFICATIONS)
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my notifications' })
  async listMine(@CurrentUser('id') userId: string, @Query() query: NotificationQueryDto) {
    return this.notificationService.listMine(userId, query);
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my notification preferences' })
  async updatePreferences(@CurrentUser('id') userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.notificationService.updatePreferences(userId, dto);
  }

  @Post(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark one of my notifications as read' })
  async markRead(@Param('notificationId') notificationId: string, @CurrentUser('id') userId: string) {
    return this.notificationService.markRead(notificationId, userId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllRead(userId);
  }
}
