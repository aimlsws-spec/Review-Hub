import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { InvoiceNoteService, InvoiceService } from '../services';

import { InvoiceController } from './invoice.controller';

describe('InvoiceController', () => {
  let controller: InvoiceController;

  const mockInvoiceService = { listForMerchant: jest.fn(), getFilePath: jest.fn() };
  const mockNoteService = { listForMerchant: jest.fn(), getFilePath: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: InvoiceNoteService, useValue: mockNoteService },
        MerchantOwnershipGuard,
        { provide: MerchantRepository, useValue: {} },
        { provide: MerchantTeamRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    jest.clearAllMocks();
  });

  it('should list invoices for the merchant', async () => {
    mockInvoiceService.listForMerchant.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    await controller.list('merchant-1', { page: 1, limit: 20 } as never);

    expect(mockInvoiceService.listForMerchant).toHaveBeenCalledWith('merchant-1', 1, 20);
  });

  it('lists the merchant’s credit and debit notes', async () => {
    await controller.listNotes('merchant-1', { page: 2, limit: 10 } as never);

    expect(mockNoteService.listForMerchant).toHaveBeenCalledWith('merchant-1', 2, 10);
  });

  it('streams a note’s PDF, asking for it as the merchant so nobody else’s can be fetched', async () => {
    mockNoteService.getFilePath.mockResolvedValue('/abs/uploads/merchant/merchant-1/invoices/CN.pdf');
    const mockRes = { sendFile: jest.fn() } as unknown as import('express').Response;

    await controller.downloadNote('merchant-1', 'note-1', mockRes);

    expect(mockNoteService.getFilePath).toHaveBeenCalledWith('merchant-1', 'note-1');
    expect(mockRes.sendFile).toHaveBeenCalledWith('/abs/uploads/merchant/merchant-1/invoices/CN.pdf');
  });

  it('should resolve the file path and stream it via res.sendFile', async () => {
    mockInvoiceService.getFilePath.mockResolvedValue('/abs/uploads/merchant/merchant-1/invoices/x.pdf');
    const mockRes = { sendFile: jest.fn() } as unknown as import('express').Response;

    await controller.download('merchant-1', 'invoice-1', mockRes);

    expect(mockInvoiceService.getFilePath).toHaveBeenCalledWith('merchant-1', 'invoice-1');
    expect(mockRes.sendFile).toHaveBeenCalledWith('/abs/uploads/merchant/merchant-1/invoices/x.pdf');
  });
});
