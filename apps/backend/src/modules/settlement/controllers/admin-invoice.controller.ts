import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { AdminInvoiceQueryDto, IssueInvoiceNoteDto } from '../dto';
import { InvoiceRepository } from '../repositories';
import { InvoiceNoteService } from '../services';

/** Admin view of every merchant's GST invoices, and the credit and debit notes issued against them. */
@ApiTags(SWAGGER_TAGS.ADMIN)
@Controller({ path: 'admin/invoices', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AdminInvoiceController {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly noteService: InvoiceNoteService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List GST invoices across all merchants' })
  async list(@Query() query: AdminInvoiceQueryDto) {
    return this.invoiceRepository.findAll(query.page, query.limit, query.merchantId);
  }

  @Get(':invoiceId/notes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit and debit notes issued against an invoice' })
  async listNotes(@Param('invoiceId') invoiceId: string) {
    return this.noteService.listForInvoice(invoiceId);
  }

  @Post(':invoiceId/notes')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Issue a credit or debit note against an invoice. A tax document only: no money moves.' })
  async issueNote(@Param('invoiceId') invoiceId: string, @CurrentUser('id') adminId: string, @Body() dto: IssueInvoiceNoteDto) {
    return this.noteService.issue(invoiceId, adminId, dto);
  }
}
