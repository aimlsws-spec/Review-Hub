import { Test, TestingModule } from '@nestjs/testing';

import { SystemRole } from '@common/enums';

import { ROLES_KEY } from '../../auth/decorators';
import { InvoiceRepository } from '../repositories';
import { InvoiceNoteService } from '../services';

import { AdminInvoiceController } from './admin-invoice.controller';

describe('AdminInvoiceController', () => {
  let controller: AdminInvoiceController;
  const invoiceRepository = { findAll: jest.fn() };
  const noteService = { issue: jest.fn(), listForInvoice: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInvoiceController],
      providers: [
        { provide: InvoiceRepository, useValue: invoiceRepository },
        { provide: InvoiceNoteService, useValue: noteService },
      ],
    }).compile();
    controller = module.get(AdminInvoiceController);
    jest.clearAllMocks();
  });

  it('lists invoices across merchants, or for one merchant', async () => {
    await controller.list({ page: 2, limit: 10, merchantId: 'merchant-1' } as never);
    await controller.list({ page: 1, limit: 20 } as never);

    expect(invoiceRepository.findAll).toHaveBeenNthCalledWith(1, 2, 10, 'merchant-1');
    expect(invoiceRepository.findAll).toHaveBeenNthCalledWith(2, 1, 20, undefined);
  });

  it('issues a note as the signed-in admin', async () => {
    const dto = { type: 'CREDIT' as const, taxableAmount: 500, reason: 'Fee billed twice' };

    await controller.issueNote('inv-1', 'admin-1', dto);

    expect(noteService.issue).toHaveBeenCalledWith('inv-1', 'admin-1', dto);
  });

  it('lists the notes on an invoice', async () => {
    await controller.listNotes('inv-1');
    expect(noteService.listForInvoice).toHaveBeenCalledWith('inv-1');
  });

  it('is for admins only, and issuing is rate limited', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminInvoiceController)).toContain(SystemRole.Admin);
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', AdminInvoiceController.prototype.issueNote)).toBe(30);
  });
});
