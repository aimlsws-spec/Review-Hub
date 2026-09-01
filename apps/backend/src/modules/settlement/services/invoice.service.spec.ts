import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { MerchantRepository } from '../../merchant/repositories';
import { InvoiceRepository, SettlementRepository } from '../repositories';

import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  let service: InvoiceService;

  const mockInvoiceRepository = {
    findBySettlementId: jest.fn(),
    findById: jest.fn(),
    findByMerchant: jest.fn(),
    getNextInvoiceNumber: jest.fn(),
    create: jest.fn(),
    setPdfPath: jest.fn(),
  };
  const mockSettlementRepository = { findById: jest.fn() };
  const mockMerchantRepository = { findById: jest.fn() };
  const mockPdfService = { generate: jest.fn() };
  const mockStorageService = { saveFile: jest.fn(), fileExists: jest.fn(), getFilePath: jest.fn() };
  const mockConfig = { get: jest.fn() };

  const settlement = {
    id: 'settlement-1',
    merchantId: 'merchant-1',
    periodStart: new Date('2026-08-30T00:00:00.000Z'),
    periodEnd: new Date('2026-08-31T00:00:00.000Z'),
    commissionAmount: 200,
  };
  const merchant = { id: 'merchant-1', businessName: 'Acme Corp', gstNumber: '22AAAAA0000A1Z5' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: InvoiceRepository, useValue: mockInvoiceRepository },
        { provide: SettlementRepository, useValue: mockSettlementRepository },
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: InvoicePdfService, useValue: mockPdfService },
        { provide: LocalStorageService, useValue: mockStorageService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();
    mockConfig.get.mockImplementation((key: string, def?: unknown) => {
      if (key === 'platform.gstRatePercent') return 18;
      if (key === 'platform.gstNumber') return 'PLATFORM_GSTIN_123';
      return def;
    });
  });

  describe('generateForSettlement', () => {
    it('should return the existing invoice without regenerating, when one already exists', async () => {
      mockInvoiceRepository.findBySettlementId.mockResolvedValue({ id: 'invoice-1' });

      const result = await service.generateForSettlement('settlement-1');

      expect(result).toEqual({ id: 'invoice-1' });
      expect(mockSettlementRepository.findById).not.toHaveBeenCalled();
      expect(mockInvoiceRepository.create).not.toHaveBeenCalled();
    });

    it('should compute GST on the commission amount, generate a PDF, and save it', async () => {
      mockInvoiceRepository.findBySettlementId.mockResolvedValue(null);
      mockSettlementRepository.findById.mockResolvedValue(settlement);
      mockMerchantRepository.findById.mockResolvedValue(merchant);
      mockInvoiceRepository.getNextInvoiceNumber.mockResolvedValue('INV-2026-000001');
      mockInvoiceRepository.create.mockResolvedValue({
        id: 'invoice-1', invoiceNumber: 'INV-2026-000001', generatedAt: new Date('2026-08-31T02:00:00.000Z'),
      });
      mockPdfService.generate.mockResolvedValue(Buffer.from('pdf-bytes'));
      mockStorageService.saveFile.mockResolvedValue({ path: '/merchant/merchant-1/invoices/INV-2026-000001.pdf' });
      mockInvoiceRepository.setPdfPath.mockResolvedValue({ id: 'invoice-1', pdfPath: '/merchant/merchant-1/invoices/INV-2026-000001.pdf' });

      const result = await service.generateForSettlement('settlement-1');

      expect(mockInvoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: 'INV-2026-000001',
          platformGstNumber: 'PLATFORM_GSTIN_123',
          merchantGstNumber: '22AAAAA0000A1Z5',
          taxableAmount: 200,
          gstRate: 18,
          gstAmount: 36,
          totalAmount: 236,
        }),
      );
      expect(mockStorageService.saveFile).toHaveBeenCalledWith(
        expect.any(Buffer), 'INV-2026-000001.pdf', 'merchant/merchant-1/invoices',
      );
      expect(result).toHaveProperty('pdfPath', '/merchant/merchant-1/invoices/INV-2026-000001.pdf');
    });

    it('should throw NotFoundException for an unknown settlement', async () => {
      mockInvoiceRepository.findBySettlementId.mockResolvedValue(null);
      mockSettlementRepository.findById.mockResolvedValue(null);

      await expect(service.generateForSettlement('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilePath', () => {
    it('should resolve the absolute path for an invoice owned by the merchant', async () => {
      mockInvoiceRepository.findById.mockResolvedValue({ id: 'invoice-1', merchantId: 'merchant-1', pdfPath: '/merchant/merchant-1/invoices/x.pdf' });
      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFilePath.mockReturnValue('uploads/merchant/merchant-1/invoices/x.pdf');

      const result = await service.getFilePath('merchant-1', 'invoice-1');

      expect(result).toContain('x.pdf');
    });

    it('should hide an invoice belonging to a different merchant as not found', async () => {
      mockInvoiceRepository.findById.mockResolvedValue({ id: 'invoice-1', merchantId: 'someone-else', pdfPath: '/x.pdf' });

      await expect(service.getFilePath('merchant-1', 'invoice-1')).rejects.toThrow(NotFoundException);
    });
  });
});
