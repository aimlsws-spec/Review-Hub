import { InvoicePdfService } from './invoice-pdf.service';

describe('InvoicePdfService', () => {
  let service: InvoicePdfService;

  beforeEach(() => {
    service = new InvoicePdfService();
  });

  it('should render a valid PDF buffer containing the invoice number', async () => {
    const buffer = await service.generate({
      invoiceNumber: 'INV-2026-000001',
      generatedAt: new Date('2026-08-31T00:00:00.000Z'),
      periodStart: new Date('2026-08-30T00:00:00.000Z'),
      periodEnd: new Date('2026-08-31T00:00:00.000Z'),
      platformGstNumber: 'PLATFORM_GSTIN_123',
      merchantGstNumber: '22AAAAA0000A1Z5',
      merchantName: 'Acme Corp',
      taxableAmount: 200,
      gstRate: 18,
      gstAmount: 36,
      totalAmount: 236,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
