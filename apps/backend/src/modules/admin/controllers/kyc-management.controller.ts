import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { KycReviewItemDto, KycReviewQueryDto, RejectKycDto } from '../dto';
import { KycManagementService } from '../services/kyc-management.service';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/kyc', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class KycManagementController {
  constructor(private readonly kycManagementService: KycManagementService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List user KYC documents for review, filterable by status, type and search' })
  async list(@Query() query: KycReviewQueryDto) {
    return this.kycManagementService.list(query);
  }

  @Get(':documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one KYC document with its full document number' })
  @ApiOkResponse({ type: KycReviewItemDto })
  async getOne(@Param('documentId') documentId: string) {
    return this.kycManagementService.getById(documentId);
  }

  @Get(':documentId/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View the uploaded KYC file (image or PDF)' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  async getFile(@Param('documentId') documentId: string, @CurrentUser('id') adminId: string, @Res() res: Response) {
    const filePath = await this.kycManagementService.getFilePath(documentId, adminId);
    // Identity documents must never be cached by the browser or a proxy.
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
  }

  @Post(':documentId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a KYC document' })
  @ApiOkResponse({ type: KycReviewItemDto })
  async approve(@Param('documentId') documentId: string, @CurrentUser('id') adminId: string) {
    return this.kycManagementService.approve(documentId, adminId);
  }

  @Post(':documentId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a KYC document with a reason the user will see' })
  @ApiOkResponse({ type: KycReviewItemDto })
  async reject(@Param('documentId') documentId: string, @Body() dto: RejectKycDto, @CurrentUser('id') adminId: string) {
    return this.kycManagementService.reject(documentId, adminId, dto.reason);
  }
}
