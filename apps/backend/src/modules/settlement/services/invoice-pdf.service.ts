import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

export interface InvoicePdfData {
  invoiceNumber: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  platformGstNumber: string | null;
  merchantGstNumber: string | null;
  merchantName: string;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

/** Renders a tax invoice to a PDF buffer, entirely locally — no external service call. */
@Injectable()
export class InvoicePdfService {
  generate(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Tax Invoice', { align: 'right' });
      doc.fontSize(10)
        .text(`Invoice Number: ${data.invoiceNumber}`, { align: 'right' })
        .text(`Date: ${data.generatedAt.toDateString()}`, { align: 'right' });
      doc.moveDown(2);

      doc.fontSize(12).text('Billed to');
      doc.fontSize(10)
        .text(data.merchantName)
        .text(`GSTIN: ${data.merchantGstNumber ?? 'Not provided'}`);
      doc.moveDown();
      doc.text(`Billing period: ${data.periodStart.toDateString()} - ${data.periodEnd.toDateString()}`);
      doc.moveDown(2);

      doc.fontSize(12).text('Platform service fee', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10)
        .text(`Taxable amount: Rs ${data.taxableAmount.toFixed(2)}`)
        .text(`GST (${data.gstRate}%): Rs ${data.gstAmount.toFixed(2)}`);
      doc.fontSize(12).text(`Total: Rs ${data.totalAmount.toFixed(2)}`);
      doc.moveDown(2);

      doc.fontSize(8).fillColor('gray').text(`Issuer GSTIN: ${data.platformGstNumber ?? 'Not configured'}`);

      doc.end();
    });
  }
}
