import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { MERCHANT_TEAM_PERMISSIONS } from '../../merchant/constants';
import { TeamRoles } from '../../merchant/decorators';
import { MerchantOwnershipGuard, MerchantTeamRoleGuard } from '../../merchant/guards';
import { MerchantSubmissionQueryDto, RejectSubmissionDto } from '../dto';
import { MerchantSubmissionService } from '../services';

/** A merchant reviewing the task submissions to their own campaigns. Deciding takes a role that manages campaigns. */
@ApiTags(SWAGGER_TAGS.SUBMISSIONS)
@Controller({ path: 'merchants/:merchantId/submissions', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class MerchantSubmissionController {
  constructor(private readonly merchantSubmissionService: MerchantSubmissionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the submissions to this merchant's campaigns" })
  async list(@Param('merchantId') merchantId: string, @Query() query: MerchantSubmissionQueryDto) {
    return this.merchantSubmissionService.list(merchantId, query);
  }

  @Get(':submissionId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "One submission to this merchant's campaigns" })
  async get(@Param('merchantId') merchantId: string, @Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.merchantSubmissionService.get(merchantId, submissionId);
  }

  @Get(':submissionId/evidence')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The file a participant uploaded as proof' })
  async evidence(
    @Param('merchantId') merchantId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Res() res: Response,
  ) {
    res.sendFile(await this.merchantSubmissionService.getEvidenceFilePath(merchantId, submissionId));
  }

  @Post(':submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a submission, which pays its reward' })
  async approve(
    @Param('merchantId') merchantId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.merchantSubmissionService.approve(merchantId, submissionId, reviewerId);
  }

  @Post(':submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantTeamRoleGuard)
  @TeamRoles(...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a submission, with the reason the participant is shown' })
  async reject(
    @Param('merchantId') merchantId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectSubmissionDto,
  ) {
    return this.merchantSubmissionService.reject(merchantId, submissionId, reviewerId, dto);
  }
}
