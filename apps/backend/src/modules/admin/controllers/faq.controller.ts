import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { CreateFaqDto, FaqQueryDto, UpdateFaqDto } from '../dto';
import { FaqService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/cms/faqs', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List FAQs' })
  async list(@Query() query: FaqQueryDto) {
    return this.faqService.list(query);
  }

  @Get(':faqId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an FAQ' })
  async getById(@Param('faqId') faqId: string) {
    return this.faqService.getById(faqId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an FAQ' })
  async create(@Body() dto: CreateFaqDto, @CurrentUser('id') adminId: string) {
    return this.faqService.create(dto, adminId);
  }

  @Patch(':faqId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an FAQ' })
  async update(@Param('faqId') faqId: string, @Body() dto: UpdateFaqDto, @CurrentUser('id') adminId: string) {
    return this.faqService.update(faqId, dto, adminId);
  }

  @Delete(':faqId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an FAQ' })
  async remove(@Param('faqId') faqId: string, @CurrentUser('id') adminId: string) {
    return this.faqService.remove(faqId, adminId);
  }
}
