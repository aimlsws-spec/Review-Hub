import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { InvoiceRepository } from './invoice.repository';

describe('InvoiceRepository', () => {
  let repository: InvoiceRepository;

  const mockPrisma = {
    invoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<InvoiceRepository>(InvoiceRepository);
    jest.clearAllMocks();
  });

  describe('getNextInvoiceNumber', () => {
    it('should build a sequential number scoped to the current year', async () => {
      mockPrisma.invoice.count.mockResolvedValue(4);

      const result = await repository.getNextInvoiceNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`INV-${year}-000005`);
      expect(mockPrisma.invoice.count).toHaveBeenCalledWith({
        where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      });
    });

    it('should start at 000001 for the first invoice of the year', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);

      const result = await repository.getNextInvoiceNumber();

      expect(result).toBe(`INV-${new Date().getFullYear()}-000001`);
    });
  });

  describe('findByMerchant', () => {
    it('should return paginated invoices for a merchant', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([{ id: 'invoice-1' }]);
      mockPrisma.invoice.count.mockResolvedValue(1);

      const result = await repository.findByMerchant('merchant-1', 1, 20);

      expect(result).toEqual({ data: [{ id: 'invoice-1' }], total: 1, page: 1, limit: 20 });
    });
  });

  describe('setPdfPath', () => {
    it('should update the invoice with the saved file path', async () => {
      mockPrisma.invoice.update.mockResolvedValue({ id: 'invoice-1', pdfPath: '/merchant/m1/invoices/x.pdf' });

      await repository.setPdfPath('invoice-1', '/merchant/m1/invoices/x.pdf');

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: { pdfPath: '/merchant/m1/invoices/x.pdf' },
      });
    });
  });
});
