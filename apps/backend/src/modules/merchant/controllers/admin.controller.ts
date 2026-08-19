import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MerchantStatus } from '@prisma/client';
import { Response } from 'express';

import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { ApproveMerchantDto, RejectMerchantDto, RequestDocumentsDto } from '../dto';
import { AdminService, KycService } from '../services';

@ApiTags('Admin - Merchants')
@Controller({ path: 'admin/merchants', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
export class AdminMerchantController {
  constructor(
    private readonly adminService: AdminService,
    private readonly kycService: KycService,
  ) {}

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending merchants' })
  async listPending() {
    return this.adminService.listPendingMerchants();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all merchants with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listAllMerchants(Number(page), Number(limit), status, search);
  }

  @Get(':merchantId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant details (admin)' })
  async getMerchantDetail(@Param('merchantId') merchantId: string) {
    return this.adminService.getMerchantDetail(merchantId);
  }

  @Get(':merchantId/documents/:documentId/file')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Download/view one of a merchant's KYC document files (admin)" })
  async getDocumentFile(
    @Param('merchantId') merchantId: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.kycService.getDocumentFilePath(merchantId, documentId);
    res.sendFile(filePath);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a merchant' })
  @ApiBody({ type: ApproveMerchantDto })
  async approveMerchant(@Body() dto: ApproveMerchantDto, @CurrentUser('id') adminId: string) {
    return this.adminService.approveMerchant(dto, adminId);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a merchant' })
  @ApiBody({ type: RejectMerchantDto })
  async rejectMerchant(@Body() dto: RejectMerchantDto, @CurrentUser('id') adminId: string) {
    return this.adminService.rejectMerchant(dto, adminId);
  }

  @Post('request-documents')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request additional documents from merchant' })
  @ApiBody({ type: RequestDocumentsDto })
  async requestDocuments(@Body() dto: RequestDocumentsDto) {
    return this.adminService.requestDocuments(dto);
  }

  @Patch(':merchantId/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle merchant status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' } } } })
  async toggleStatus(
    @Param('merchantId') merchantId: string,
    @Body('status') status: MerchantStatus,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.toggleMerchantStatus(merchantId, status, adminId);
  }
}
