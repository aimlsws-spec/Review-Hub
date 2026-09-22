import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';
import { describeError } from '@common/utils';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { LocalStorageService } from '../../../storage/storage.service';
import { MerchantRepository } from '../../merchant/repositories';
import { IssueInvoiceNoteDto } from '../dto';
import { InvoiceNoteRepository } from '../repositories';

import { InvoicePdfService } from './invoice-pdf.service';

type IssuedNote = NonNullable<Awaited<ReturnType<InvoiceNoteRepository['findById']>>>;

/**
 * Credit and debit notes against a GST invoice. A credit note lowers what an invoice charged (for example a fee billed in
 * error); a debit note adds to it. They are tax documents: issuing one does not move any money, and it can not be edited
 * or removed. A mistake is put right with another note.
 */
@Injectable()
export class InvoiceNoteService {
  private readonly logger = new Logger(InvoiceNoteService.name);

  constructor(
    private readonly noteRepository: InvoiceNoteRepository,
    private readonly merchantRepository: MerchantRepository,
    private readonly pdfService: InvoicePdfService,
    private readonly storageService: LocalStorageService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async issue(invoiceId: string, adminId: string, dto: IssueInvoiceNoteDto) {
    const note = await this.noteRepository.issue({
      invoiceId,
      type: dto.type,
      taxableAmount: dto.taxableAmount,
      reason: dto.reason,
      issuedBy: adminId,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'InvoiceNote',
      entityId: note.id,
      action: 'CREATE',
      after: { noteNumber: note.noteNumber, type: note.type, invoiceId, taxableAmount: Number(note.taxableAmount), totalAmount: Number(note.totalAmount), reason: dto.reason },
    });

    // The note is valid the moment it is saved. If the PDF can not be made now, it is made when it is first downloaded.
    try {
      const full = await this.noteRepository.findById(note.id);
      if (full) return await this.renderAndStore(full);
    } catch (error) {
      this.logger.error(`Note ${note.noteNumber} was issued but its PDF could not be made yet: ${describeError(error)}`);
    }
    return note;
  }

  async listForInvoice(invoiceId: string) {
    return this.noteRepository.findByInvoice(invoiceId);
  }

  async listForMerchant(merchantId: string, page: number, limit: number) {
    return this.noteRepository.findByMerchant(merchantId, page, limit);
  }

  /** The PDF's path for streaming, made first if it was not made when the note was issued. Only the merchant it is for can get it. */
  async getFilePath(merchantId: string, noteId: string): Promise<string> {
    const note = await this.noteRepository.findById(noteId);
    if (!note || note.merchantId !== merchantId) throw new NotFoundException('Note');

    let pdfPath = note.pdfPath;
    if (!pdfPath || !(await this.storageService.fileExists(pdfPath))) {
      pdfPath = (await this.renderAndStore(note)).pdfPath;
    }
    if (!pdfPath) throw new NotFoundException('Note file');
    return path.resolve(this.storageService.getFilePath(pdfPath));
  }

  private async renderAndStore(note: IssuedNote) {
    const merchant = await this.merchantRepository.findById(note.merchantId);
    const pdf = await this.pdfService.generateNote({
      noteNumber: note.noteNumber,
      type: note.type,
      issuedAt: note.createdAt,
      invoiceNumber: note.invoice.invoiceNumber,
      invoiceDate: note.invoice.generatedAt,
      merchantName: merchant?.businessName ?? 'Merchant',
      merchantGstNumber: note.merchantGstNumber,
      platformGstNumber: note.platformGstNumber,
      reason: note.reason,
      taxableAmount: Number(note.taxableAmount),
      gstRate: Number(note.gstRate),
      gstAmount: Number(note.gstAmount),
      totalAmount: Number(note.totalAmount),
    });
    const saved = await this.storageService.saveFile(pdf, `${note.noteNumber}.pdf`, `merchant/${note.merchantId}/invoices`);
    return this.noteRepository.setPdfPath(note.id, saved.path);
  }
}
