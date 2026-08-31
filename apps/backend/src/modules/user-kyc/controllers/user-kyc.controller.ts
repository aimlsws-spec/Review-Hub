import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { UserKycUploadDto } from '../dto';
import { UserKycService } from '../services';

@ApiTags(SWAGGER_TAGS.USER_KYC)
@Controller({ path: 'kyc', version: '1' })
export class UserKycController {
  constructor(private readonly userKycService: UserKycService) {}

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a KYC document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, documentType: { type: 'string' }, documentNumber: { type: 'string' } } } })
  async uploadKyc(
    @Body() dto: UserKycUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.userKycService.uploadDocument(userId, dto, file);
  }

  @Get('documents')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my KYC documents' })
  async getDocuments(@CurrentUser('id') userId: string) {
    return this.userKycService.getDocuments(userId);
  }

  @Get('documents/:documentId/file')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download/view a KYC document file' })
  async getDocumentFile(
    @Param('documentId') documentId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.userKycService.getDocumentFilePath(userId, documentId);
    res.sendFile(filePath);
  }
}
