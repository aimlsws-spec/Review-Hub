import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CmsPageQueryDto, CreateCmsPageDto, UpdateCmsPageDto } from '../dto';
import { CmsPageService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/cms/pages', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class CmsPageController {
  constructor(private readonly cmsPageService: CmsPageService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List CMS pages' })
  async list(@Query() query: CmsPageQueryDto) {
    return this.cmsPageService.list(query);
  }

  @Get(':pageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a CMS page' })
  async getById(@Param('pageId') pageId: string) {
    return this.cmsPageService.getById(pageId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a CMS page' })
  async create(@Body() dto: CreateCmsPageDto, @CurrentUser('id') adminId: string) {
    return this.cmsPageService.create(dto, adminId);
  }

  @Patch(':pageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a CMS page' })
  async update(@Param('pageId') pageId: string, @Body() dto: UpdateCmsPageDto, @CurrentUser('id') adminId: string) {
    return this.cmsPageService.update(pageId, dto, adminId);
  }

  @Delete(':pageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a CMS page' })
  async remove(@Param('pageId') pageId: string, @CurrentUser('id') adminId: string) {
    return this.cmsPageService.remove(pageId, adminId);
  }
}
