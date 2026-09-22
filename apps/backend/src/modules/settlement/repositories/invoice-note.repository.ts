import { Injectable } from '@nestjs/common';
import { InvoiceNoteType, Prisma } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { lockInvoice } from '../../../database/prisma/row-lock';
import { NOTE_NUMBER_PREFIX } from '../constants';

const round2 = (value: number) => Math.round(value * 100) / 100;

/** How many times to try again when another note took the number first. */
const NUMBER_RETRIES = 10;

/** Prisma's code for a transaction that lost a deadlock or write conflict: safe to run again from the start. */
const DEADLOCK = 'P2034';

@Injectable()
export class InvoiceNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Issues a credit or debit note against an invoice.
   *
   * The invoice is locked while the note is checked and written. A credit note can not take off more than the invoice
   * is still worth (what it charged, plus any debit notes, less any credit notes already issued), and two credit notes
   * issued at the same moment would each pass that check against the same figures without the lock.
   *
   * Note numbers run in order for each kind and year. Two notes on different invoices can be given the same next number
   * at the same moment; the unique number makes one of them fail (or the database picks one to abandon in a deadlock), and
   * it is tried again with the next number.
   */
  async issue(params: { invoiceId: string; type: InvoiceNoteType; taxableAmount: number; reason: string; issuedBy: string }) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.issueOnce(params);
      } catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === DEADLOCK);
        if (!retryable || attempt >= NUMBER_RETRIES) throw error;
        // A short random wait, so notes issued at the same moment do not keep colliding in step.
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 40));
      }
    }
  }

  private async issueOnce(params: { invoiceId: string; type: InvoiceNoteType; taxableAmount: number; reason: string; issuedBy: string }) {
    const { invoiceId, type, taxableAmount, reason, issuedBy } = params;

    return this.prisma.transaction(async (tx) => {
      await lockInvoice(tx, invoiceId);
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new NotFoundException('Invoice');

      if (type === 'CREDIT') {
        const remaining = await this.remainingCreditable(tx, invoiceId, Number(invoice.taxableAmount));
        if (taxableAmount > remaining) {
          throw new BadRequestException(
            remaining > 0
              ? `A credit note can take off at most ₹${remaining.toFixed(2)} more from this invoice (before GST).`
              : 'This invoice has already been credited in full, so no more credit notes can be issued against it.',
          );
        }
      }

      const gstRate = Number(invoice.gstRate);
      const gstAmount = round2(taxableAmount * (gstRate / 100));
      const noteNumber = await this.nextNumber(tx, type);

      return tx.invoiceNote.create({
        data: {
          noteNumber,
          type,
          invoice: { connect: { id: invoiceId } },
          merchantId: invoice.merchantId,
          reason,
          platformGstNumber: invoice.platformGstNumber,
          merchantGstNumber: invoice.merchantGstNumber,
          taxableAmount,
          gstRate,
          gstAmount,
          totalAmount: round2(taxableAmount + gstAmount),
          issuedBy,
        },
      });
    });
  }

  /** What an invoice is still worth before GST: what it charged, plus debit notes, less credit notes. */
  async remainingCreditable(tx: Prisma.TransactionClient, invoiceId: string, invoiceTaxable: number): Promise<number> {
    const sums = await tx.invoiceNote.groupBy({ by: ['type'], where: { invoiceId }, _sum: { taxableAmount: true } });
    const total = (kind: InvoiceNoteType) => Number(sums.find((row) => row.type === kind)?._sum.taxableAmount ?? 0);
    return round2(invoiceTaxable + total('DEBIT') - total('CREDIT'));
  }

  async setPdfPath(id: string, pdfPath: string) {
    return this.prisma.invoiceNote.update({ where: { id }, data: { pdfPath } });
  }

  async findById(id: string) {
    return this.prisma.invoiceNote.findUnique({ where: { id }, include: { invoice: true } });
  }

  async findByInvoice(invoiceId: string) {
    return this.prisma.invoiceNote.findMany({ where: { invoiceId }, orderBy: { createdAt: 'asc' } });
  }

  async findByMerchant(merchantId: string, page: number, limit: number) {
    const where = { merchantId };
    const [data, total] = await Promise.all([
      this.prisma.invoiceNote.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { invoice: { select: { invoiceNumber: true } } } }),
      this.prisma.invoiceNote.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** CN-2026-000001, DN-2026-000001, and so on: in order for each kind of note in each calendar year. */
  private async nextNumber(tx: Prisma.TransactionClient, type: InvoiceNoteType): Promise<string> {
    const prefix = `${NOTE_NUMBER_PREFIX[type]}-${new Date().getFullYear()}-`;
    const count = await tx.invoiceNote.count({ where: { noteNumber: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }
}
