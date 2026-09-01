import { Controller, Get, HttpCode, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { InvoiceQueryDto } from '../dto';
import { InvoiceService } from '../services';

@ApiTags(SWAGGER_TAGS.SETTLEMENTS)
@Controller({ path: 'merchants/:merchantId/invoices', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's GST invoices" })
  async list(@Param('merchantId') merchantId: string, @Query() query: InvoiceQueryDto) {
    return this.invoiceService.listForMerchant(merchantId, query.page, query.limit);
  }

  @Get(':invoiceId/download')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download an invoice PDF' })
  async download(
    @Param('merchantId') merchantId: string,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.invoiceService.getFilePath(merchantId, invoiceId);
    res.sendFile(filePath);
  }
}
