import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import {
  AddBankDto,
  CreateRechargeDto,
  InviteTeamDto,
  KycResubmitDto,
  KycUploadDto,
  RegisterMerchantDto,
  SetDefaultBankDto,
  UpdateBankDto,
  UpdateMerchantDto,
  UpdateTeamDto,
  VerifyRechargeDto,
} from '../dto';
import { MerchantOwnershipGuard } from '../guards';
import { MerchantService, KycService, TeamService, BankService, WalletService, DashboardService } from '../services';

@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants', version: '1' })
export class MerchantController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly kycService: KycService,
    private readonly teamService: TeamService,
    private readonly bankService: BankService,
    private readonly walletService: WalletService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new merchant profile' })
  @ApiBody({ type: RegisterMerchantDto })
  async register(@CurrentUser('id') userId: string, @Body() dto: RegisterMerchantDto) {
    return this.merchantService.register(userId, dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user merchant profile' })
  async getMyMerchant(@CurrentUser('id') userId: string) {
    return this.merchantService.getProfileByUserId(userId);
  }

  @Get(':merchantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant profile by ID' })
  async getProfile(@Param('merchantId') merchantId: string) {
    return this.merchantService.getProfile(merchantId);
  }

  @Patch(':merchantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update merchant profile' })
  @ApiBody({ type: UpdateMerchantDto })
  async updateProfile(@Param('merchantId') merchantId: string, @Body() dto: UpdateMerchantDto) {
    return this.merchantService.updateProfile(merchantId, dto);
  }

  @Get(':merchantId/verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant verification status' })
  async getVerificationStatus(@Param('merchantId') merchantId: string) {
    return this.merchantService.getVerificationStatus(merchantId);
  }

  @Post(':merchantId/kyc/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(MerchantOwnershipGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload KYC document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, documentType: { type: 'string' }, documentNumber: { type: 'string' } } } })
  async uploadKyc(
    @Param('merchantId') merchantId: string,
    @Body() dto: KycUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.kycService.uploadDocument(merchantId, dto, file);
  }

  @Post(':merchantId/kyc/resubmit')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(MerchantOwnershipGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resubmit a rejected KYC document' })
  @ApiConsumes('multipart/form-data')
  async resubmitKyc(
    @Param('merchantId') merchantId: string,
    @Body() dto: KycResubmitDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.kycService.resubmitDocument(merchantId, dto, file);
  }

  @Get(':merchantId/kyc/documents')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all KYC documents' })
  async getDocuments(@Param('merchantId') merchantId: string) {
    return this.kycService.getDocuments(merchantId);
  }

  @Get(':merchantId/kyc/documents/:documentId/file')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download/view a KYC document file' })
  async getDocumentFile(
    @Param('merchantId') merchantId: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.kycService.getDocumentFilePath(merchantId, documentId);
    res.sendFile(filePath);
  }

  @Post(':merchantId/team/invite')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a team member' })
  @ApiBody({ type: InviteTeamDto })
  async inviteTeamMember(
    @Param('merchantId') merchantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteTeamDto,
  ) {
    return this.teamService.invite(merchantId, userId, dto);
  }

  @Get(':merchantId/team')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team members' })
  async getTeamMembers(@Param('merchantId') merchantId: string) {
    return this.teamService.getTeamMembers(merchantId);
  }

  @Patch(':merchantId/team/:memberId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update team member role' })
  @ApiBody({ type: UpdateTeamDto })
  async updateTeamMember(
    @Param('merchantId') merchantId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamService.updateTeamMember(merchantId, memberId, dto);
  }

  @Delete(':merchantId/team/:memberId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a team member' })
  async removeTeamMember(
    @Param('merchantId') merchantId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeTeamMember(merchantId, memberId);
  }

  @Get(':merchantId/invitations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending invitations' })
  async getInvitations(@Param('merchantId') merchantId: string) {
    return this.teamService.getInvitations(merchantId);
  }

  @Delete(':merchantId/invitations/:invitationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an invitation' })
  async cancelInvitation(
    @Param('merchantId') merchantId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.teamService.cancelInvitation(merchantId, invitationId);
  }

  @Get(':merchantId/bank-accounts')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bank accounts' })
  async getBankAccounts(@Param('merchantId') merchantId: string) {
    return this.bankService.getBankAccounts(merchantId);
  }

  @Post(':merchantId/bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a bank account' })
  @ApiBody({ type: AddBankDto })
  async addBankAccount(@Param('merchantId') merchantId: string, @Body() dto: AddBankDto) {
    return this.bankService.addBankAccount(merchantId, dto);
  }

  @Patch(':merchantId/bank-accounts/:bankId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update bank account' })
  @ApiBody({ type: UpdateBankDto })
  async updateBankAccount(
    @Param('merchantId') merchantId: string,
    @Param('bankId') bankId: string,
    @Body() dto: UpdateBankDto,
  ) {
    return this.bankService.updateBankAccount(merchantId, bankId, dto);
  }

  @Delete(':merchantId/bank-accounts/:bankId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete bank account' })
  async deleteBankAccount(
    @Param('merchantId') merchantId: string,
    @Param('bankId') bankId: string,
  ) {
    return this.bankService.deleteBankAccount(merchantId, bankId);
  }

  @Post(':merchantId/bank-accounts/default')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set default bank account' })
  @ApiBody({ type: SetDefaultBankDto })
  async setDefaultBank(
    @Param('merchantId') merchantId: string,
    @Body() dto: SetDefaultBankDto,
  ) {
    return this.bankService.setDefaultBankAccount(merchantId, dto.bankId);
  }

  @Get(':merchantId/wallet')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet details' })
  async getWallet(@Param('merchantId') merchantId: string) {
    return this.walletService.getWallet(merchantId);
  }

  @Get(':merchantId/wallet/transactions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @Param('merchantId') merchantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.walletService.getTransactions(merchantId, Number(page), Number(limit));
  }

  @Post(':merchantId/wallet/recharge')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Razorpay order to recharge the wallet' })
  @ApiBody({ type: CreateRechargeDto })
  async createRecharge(@Param('merchantId') merchantId: string, @Body() dto: CreateRechargeDto) {
    return this.walletService.createRechargeOrder(merchantId, dto.amount);
  }

  @Post(':merchantId/wallet/recharge/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a completed Razorpay Checkout payment and credit the wallet' })
  @ApiBody({ type: VerifyRechargeDto })
  async verifyRecharge(@Param('merchantId') merchantId: string, @Body() dto: VerifyRechargeDto) {
    return this.walletService.verifyRecharge(merchantId, dto);
  }

  @Get(':merchantId/dashboard')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MerchantOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant dashboard' })
  async getDashboard(@Param('merchantId') merchantId: string) {
    return this.dashboardService.getDashboard(merchantId);
  }
}
