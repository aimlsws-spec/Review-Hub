import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from '../dto';
import { NotificationTemplateService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/notifications/templates', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminNotificationTemplateController {
  constructor(private readonly templateService: NotificationTemplateService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reusable message templates' })
  async list() {
    return this.templateService.list();
  }

  @Get(':templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one template' })
  async getOne(@Param('templateId', ParseUUIDPipe) templateId: string) {
    return this.templateService.getById(templateId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a template' })
  async create(@Body() dto: CreateNotificationTemplateDto, @CurrentUser('id') adminId: string) {
    return this.templateService.create(dto, adminId);
  }

  @Patch(':templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a template' })
  async update(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateNotificationTemplateDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.templateService.update(templateId, dto, adminId);
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a template (broadcasts already sent from it are unaffected)' })
  async remove(@Param('templateId', ParseUUIDPipe) templateId: string, @CurrentUser('id') adminId: string) {
    return this.templateService.remove(templateId, adminId);
  }
}
