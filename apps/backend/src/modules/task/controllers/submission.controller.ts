import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { RejectSubmissionDto, SubmissionQueryDto } from '../dto';
import { SubmissionService } from '../services';

@ApiTags(SWAGGER_TAGS.SUBMISSIONS)
@Controller({ path: 'submissions', version: '1' })
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my task submissions' })
  async listMine(@CurrentUser('id') userId: string, @Query() query: SubmissionQueryDto) {
    return this.submissionService.listMine(userId, query);
  }

  @Get(':submissionId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one of my task submissions' })
  async getMine(@Param('submissionId') submissionId: string, @CurrentUser('id') userId: string) {
    return this.submissionService.getMine(submissionId, userId);
  }

  @Post(':submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending submission and trigger its reward (reviewer only)' })
  async approve(@Param('submissionId') submissionId: string, @CurrentUser('id') reviewerId: string) {
    return this.submissionService.approve(submissionId, reviewerId);
  }

  @Post(':submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending submission (reviewer only)' })
  async reject(
    @Param('submissionId') submissionId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectSubmissionDto,
  ) {
    return this.submissionService.reject(submissionId, reviewerId, dto);
  }
}
