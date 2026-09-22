import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MerchantStatus } from '@prisma/client';
import { Request, Response } from 'express';

import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { ApproveMerchantDto, ManualTopUpDto, RejectMerchantDto, RejectRefundDto, RequestDocumentsDto, TopUpReasonDto } from '../dto';
import { AdminService, KycService, ManualTopUpService, RefundService } from '../services';

@ApiTags('Admin - Merchants')
@Controller({ path: 'admin/merchants', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
export class AdminMerchantController {
  constructor(
    private readonly adminService: AdminService,
    private readonly kycService: KycService,
    private readonly refundService: RefundService,
    private readonly manualTopUpService: ManualTopUpService,
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

  @Get('refunds/pending')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List merchant refund requests awaiting review' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPendingRefunds(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.refundService.listPendingForAdmin(Number(page), Number(limit));
  }

  @Post('refunds/:refundId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a merchant refund request' })
  async approveRefund(@Param('refundId') refundId: string, @CurrentUser('id') adminId: string) {
    return this.refundService.approve(refundId, adminId);
  }

  @Post('refunds/:refundId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a merchant refund request' })
  @ApiBody({ type: RejectRefundDto })
  async rejectRefund(
    @Param('refundId') refundId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectRefundDto,
  ) {
    return this.refundService.reject(refundId, adminId, dto);
  }

  @Post(':merchantId/wallet/top-ups')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add money to a merchant wallet after a bank transfer, with the bank reference. Each reference works once.' })
  @ApiBody({ type: ManualTopUpDto })
  async recordManualTopUp(
    @Param('merchantId') merchantId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ManualTopUpDto,
    @Req() request: Request,
  ) {
    return this.manualTopUpService.record(merchantId, adminId, dto, request.ip);
  }

  @Get('top-ups/pending')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Large bank-transfer top-ups waiting for a second admin, across all merchants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPendingTopUps(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.manualTopUpService.listPendingApproval(Number(page), Number(limit));
  }

  @Post('top-ups/:topUpId/approve')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a large top-up recorded by another admin. The money is credited now.' })
  async approveTopUp(@Param('topUpId') topUpId: string, @CurrentUser('id') adminId: string, @Req() request: Request) {
    return this.manualTopUpService.approve(topUpId, adminId, request.ip);
  }

  @Post('top-ups/:topUpId/reject')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Turn down a large top-up recorded by another admin. Nothing was credited; the bank reference is given back.' })
  @ApiBody({ type: TopUpReasonDto })
  async rejectTopUp(@Param('topUpId') topUpId: string, @CurrentUser('id') adminId: string, @Body() dto: TopUpReasonDto, @Req() request: Request) {
    return this.manualTopUpService.reject(topUpId, adminId, dto.reason, request.ip);
  }

  @Post('top-ups/:topUpId/reverse')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Take a top-up made in error back out of the wallet, with a new opposite entry. Only while the merchant still has the money.' })
  @ApiBody({ type: TopUpReasonDto })
  async reverseTopUp(@Param('topUpId') topUpId: string, @CurrentUser('id') adminId: string, @Body() dto: TopUpReasonDto, @Req() request: Request) {
    return this.manualTopUpService.reverse(topUpId, adminId, dto.reason, request.ip);
  }

  @Get(':merchantId/wallet/top-ups')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bank-transfer top-ups recorded for a merchant, newest first' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listManualTopUps(@Param('merchantId') merchantId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.manualTopUpService.list(merchantId, Number(page), Number(limit));
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
