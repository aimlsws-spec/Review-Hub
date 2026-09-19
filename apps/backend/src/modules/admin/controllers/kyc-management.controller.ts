import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { KycManagementService } from '../services/kyc-management.service';

@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/kyc', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class KycManagementController {
  constructor(private readonly kycManagementService: KycManagementService) {}

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pending KYC documents' })
  async listPending(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.kycManagementService.listPending(Number(page), Number(limit));
  }

  @Post(':documentId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a KYC document' })
  async approve(@Param('documentId') documentId: string, @CurrentUser('id') adminId: string) {
    return this.kycManagementService.approve(documentId, adminId);
  }

  @Post(':documentId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a KYC document' })
  async reject(
    @Param('documentId') documentId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.kycManagementService.reject(documentId, adminId, reason);
  }
}
