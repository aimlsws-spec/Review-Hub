import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { InvoiceService } from '../services';

import { InvoiceController } from './invoice.controller';

describe('InvoiceController', () => {
  let controller: InvoiceController;

  const mockInvoiceService = { listForMerchant: jest.fn(), getFilePath: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        { provide: InvoiceService, useValue: mockInvoiceService },
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

  it('should resolve the file path and stream it via res.sendFile', async () => {
    mockInvoiceService.getFilePath.mockResolvedValue('/abs/uploads/merchant/merchant-1/invoices/x.pdf');
    const mockRes = { sendFile: jest.fn() } as unknown as import('express').Response;

    await controller.download('merchant-1', 'invoice-1', mockRes);

    expect(mockInvoiceService.getFilePath).toHaveBeenCalledWith('merchant-1', 'invoice-1');
    expect(mockRes.sendFile).toHaveBeenCalledWith('/abs/uploads/merchant/merchant-1/invoices/x.pdf');
  });
});
