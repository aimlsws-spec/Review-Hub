import { Controller, Get, HttpCode, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { InvoiceQueryDto } from '../dto';
import { InvoiceNoteService, InvoiceService } from '../services';

@ApiTags(SWAGGER_TAGS.SETTLEMENTS)
@Controller({ path: 'merchants/:merchantId/invoices', version: '1' })
@UseGuards(MerchantOwnershipGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly noteService: InvoiceNoteService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's GST invoices" })
  async list(@Param('merchantId') merchantId: string, @Query() query: InvoiceQueryDto) {
    return this.invoiceService.listForMerchant(merchantId, query.page, query.limit);
  }

  @Get('notes')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List this merchant's credit and debit notes" })
  async listNotes(@Param('merchantId') merchantId: string, @Query() query: InvoiceQueryDto) {
    return this.noteService.listForMerchant(merchantId, query.page, query.limit);
  }

  @Get('notes/:noteId/download')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a credit or debit note PDF' })
  async downloadNote(@Param('merchantId') merchantId: string, @Param('noteId') noteId: string, @Res() res: Response) {
    res.sendFile(await this.noteService.getFilePath(merchantId, noteId));
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
