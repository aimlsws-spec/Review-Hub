import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { INVOICE_NUMBER_PREFIX } from '../constants';

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySettlementId(settlementId: string) {
    return this.prisma.invoice.findUnique({ where: { settlementId } });
  }

  async findById(id: string) {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async findByMerchant(merchantId: string, page: number, limit: number) {
    const where = { merchantId };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { generatedAt: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /**
   * Sequential per calendar year (INV-2026-000001, ...). Not race-safe under
   * true concurrent invoice creation, but this only ever runs from the single
   * serial nightly settlement job — and invoiceNumber's unique constraint
   * would surface a real collision instead of silently duplicating one.
   */
  async getNextInvoiceNumber(): Promise<string> {
    const prefix = `${INVOICE_NUMBER_PREFIX}-${new Date().getFullYear()}-`;
    const count = await this.prisma.invoice.count({ where: { invoiceNumber: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  async create(data: Prisma.InvoiceCreateInput) {
    return this.prisma.invoice.create({ data });
  }

  async setPdfPath(id: string, pdfPath: string) {
    return this.prisma.invoice.update({ where: { id }, data: { pdfPath } });
  }
}
