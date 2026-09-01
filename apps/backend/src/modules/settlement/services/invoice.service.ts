import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { MerchantRepository } from '../../merchant/repositories';
import { InvoiceRepository, SettlementRepository } from '../repositories';

import { InvoicePdfService } from './invoice-pdf.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly merchantRepository: MerchantRepository,
    private readonly pdfService: InvoicePdfService,
    private readonly storageService: LocalStorageService,
    private readonly config: ConfigService,
  ) {}

  /** Idempotent — a settlement that already has an invoice returns it as-is. */
  async generateForSettlement(settlementId: string) {
    const existing = await this.invoiceRepository.findBySettlementId(settlementId);
    if (existing) return existing;

    const settlement = await this.settlementRepository.findById(settlementId);
    if (!settlement) throw new NotFoundException('Settlement');

    const merchant = await this.merchantRepository.findById(settlement.merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const gstRate = this.config.get<number>('platform.gstRatePercent', 18);
    const platformGstNumber = this.config.get<string>('platform.gstNumber') ?? null;
    const taxableAmount = Number(settlement.commissionAmount);
    const gstAmount = Number((taxableAmount * (gstRate / 100)).toFixed(2));
    const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));
    const invoiceNumber = await this.invoiceRepository.getNextInvoiceNumber();

    const invoice = await this.invoiceRepository.create({
      settlement: { connect: { id: settlementId } },
      merchant: { connect: { id: settlement.merchantId } },
      invoiceNumber,
      platformGstNumber,
      merchantGstNumber: merchant.gstNumber,
      taxableAmount,
      gstRate,
      gstAmount,
      totalAmount,
    });

    const pdfBuffer = await this.pdfService.generate({
      invoiceNumber,
      generatedAt: invoice.generatedAt,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      platformGstNumber,
      merchantGstNumber: merchant.gstNumber,
      merchantName: merchant.businessName,
      taxableAmount,
      gstRate,
      gstAmount,
      totalAmount,
    });

    const saved = await this.storageService.saveFile(pdfBuffer, `${invoiceNumber}.pdf`, `merchant/${settlement.merchantId}/invoices`);
    return this.invoiceRepository.setPdfPath(invoice.id, saved.path);
  }

  async listForMerchant(merchantId: string, page: number, limit: number) {
    return this.invoiceRepository.findByMerchant(merchantId, page, limit);
  }

  /** Resolves an invoice to an absolute PDF path for streaming — mirrors KycService.getDocumentFilePath. */
  async getFilePath(merchantId: string, invoiceId: string): Promise<string> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice || invoice.merchantId !== merchantId || !invoice.pdfPath) {
      throw new NotFoundException('Invoice');
    }

    const exists = await this.storageService.fileExists(invoice.pdfPath);
    if (!exists) throw new NotFoundException('Invoice file');

    return path.resolve(this.storageService.getFilePath(invoice.pdfPath));
  }
}
