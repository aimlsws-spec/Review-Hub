import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { PaginationQueryDto } from '@common/dto';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import {
  CreateAiModelDto,
  CreateAiPromptTemplateDto,
  CreateAiProviderDto,
  UpdateAiProviderDto,
} from '../dto';
import { AiProviderAdminService } from '../services';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/ai-providers', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminAiProviderController {
  constructor(private readonly aiProviderAdminService: AiProviderAdminService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List AI providers' })
  async list() {
    return this.aiProviderAdminService.list();
  }

  @Get(':providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an AI provider' })
  async getById(@Param('providerId') providerId: string) {
    return this.aiProviderAdminService.getById(providerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an AI provider' })
  async create(@Body() dto: CreateAiProviderDto, @CurrentUser('id') adminId: string) {
    return this.aiProviderAdminService.create(dto, adminId);
  }

  @Patch(':providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an AI provider' })
  async update(@Param('providerId') providerId: string, @Body() dto: UpdateAiProviderDto, @CurrentUser('id') adminId: string) {
    return this.aiProviderAdminService.update(providerId, dto, adminId);
  }

  @Delete(':providerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an AI provider' })
  async remove(@Param('providerId') providerId: string, @CurrentUser('id') adminId: string) {
    return this.aiProviderAdminService.remove(providerId, adminId);
  }

  @Post(':providerId/models')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a model to an AI provider' })
  async addModel(@Param('providerId') providerId: string, @Body() dto: CreateAiModelDto) {
    return this.aiProviderAdminService.addModel(providerId, dto);
  }

  @Delete('models/:modelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an AI provider model' })
  async removeModel(@Param('modelId') modelId: string) {
    return this.aiProviderAdminService.removeModel(modelId);
  }

  @Post(':providerId/prompt-templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a prompt template to an AI provider' })
  async addPromptTemplate(@Param('providerId') providerId: string, @Body() dto: CreateAiPromptTemplateDto) {
    return this.aiProviderAdminService.addPromptTemplate(providerId, dto);
  }

  @Delete('prompt-templates/:templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an AI provider prompt template' })
  async removePromptTemplate(@Param('templateId') templateId: string) {
    return this.aiProviderAdminService.removePromptTemplate(templateId);
  }

  @Get(':providerId/usage-logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List usage logs for an AI provider' })
  async listUsageLogs(@Param('providerId') providerId: string, @Query() query: PaginationQueryDto) {
    return this.aiProviderAdminService.listUsageLogs(providerId, query.page, query.limit);
  }
}
