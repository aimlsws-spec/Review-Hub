import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { InvoiceNoteService } from './invoice-note.service';

describe('InvoiceNoteService', () => {
  const noteRepository = { issue: jest.fn(), findById: jest.fn(), setPdfPath: jest.fn(), findByInvoice: jest.fn(), findByMerchant: jest.fn() };
  const merchantRepository = { findById: jest.fn() };
  const pdfService = { generateNote: jest.fn() };
  const storage = { saveFile: jest.fn(), fileExists: jest.fn(), getFilePath: jest.fn() };
  const audit = { record: jest.fn() };
  let service: InvoiceNoteService;

  const issued = { id: 'note-1', noteNumber: 'CN-2026-000001', type: 'CREDIT', taxableAmount: '400.00', totalAmount: '472.00', merchantId: 'merchant-1' };
  const full = {
    ...issued,
    createdAt: new Date('2026-09-21T10:00:00Z'),
    reason: 'Billed twice',
    merchantGstNumber: 'M-GST',
    platformGstNumber: 'P-GST',
    gstRate: '18.00',
    gstAmount: '72.00',
    pdfPath: null,
    invoice: { invoiceNumber: 'INV-2026-000001', generatedAt: new Date('2026-09-01T00:00:00Z') },
  };
  const dto = { type: 'CREDIT' as const, taxableAmount: 400, reason: 'Billed twice' };

  beforeEach(() => {
    jest.resetAllMocks();
    noteRepository.issue.mockResolvedValue(issued);
    noteRepository.findById.mockResolvedValue(full);
    noteRepository.setPdfPath.mockResolvedValue({ ...full, pdfPath: 'merchant/merchant-1/invoices/CN-2026-000001.pdf' });
    merchantRepository.findById.mockResolvedValue({ businessName: 'Brew Bar' });
    pdfService.generateNote.mockResolvedValue(Buffer.from('pdf'));
    storage.saveFile.mockResolvedValue({ path: 'merchant/merchant-1/invoices/CN-2026-000001.pdf' });
    storage.getFilePath.mockImplementation((p: string) => `/data/${p}`);
    service = new InvoiceNoteService(noteRepository as never, merchantRepository as never, pdfService as never, storage as never, audit as never);
  });

  describe('issue', () => {
    it('issues the note, audits it with who did it, and makes the PDF', async () => {
      const result = await service.issue('inv-1', 'admin-1', dto);

      expect(noteRepository.issue).toHaveBeenCalledWith({ invoiceId: 'inv-1', type: 'CREDIT', taxableAmount: 400, reason: 'Billed twice', issuedBy: 'admin-1' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', entity: 'InvoiceNote', entityId: 'note-1', action: 'CREATE' }),
      );
      expect(pdfService.generateNote).toHaveBeenCalledWith(expect.objectContaining({ noteNumber: 'CN-2026-000001', invoiceNumber: 'INV-2026-000001', merchantName: 'Brew Bar', totalAmount: 472 }));
      expect(result).toHaveProperty('pdfPath', 'merchant/merchant-1/invoices/CN-2026-000001.pdf');
    });

    it('issues nothing, and audits nothing, when the repository refuses (for example a credit above what is left)', async () => {
      noteRepository.issue.mockRejectedValue(new Error('too much'));

      await expect(service.issue('inv-1', 'admin-1', dto)).rejects.toThrow('too much');
      expect(audit.record).not.toHaveBeenCalled();
      expect(pdfService.generateNote).not.toHaveBeenCalled();
    });

    it('still returns the note when the PDF can not be made: the note is valid, the PDF is made later', async () => {
      pdfService.generateNote.mockRejectedValue(new Error('disk full'));

      await expect(service.issue('inv-1', 'admin-1', dto)).resolves.toMatchObject({ id: 'note-1' });
    });
  });

  describe('download', () => {
    it('gives the merchant the file of their own note', async () => {
      noteRepository.findById.mockResolvedValue({ ...full, pdfPath: 'merchant/merchant-1/invoices/CN-2026-000001.pdf' });
      storage.fileExists.mockResolvedValue(true);

      const filePath = await service.getFilePath('merchant-1', 'note-1');

      expect(filePath).toContain('CN-2026-000001.pdf');
      expect(pdfService.generateNote).not.toHaveBeenCalled();
    });

    it('hides another merchant’s note as not found', async () => {
      await expect(service.getFilePath('someone-else', 'note-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides a note that does not exist', async () => {
      noteRepository.findById.mockResolvedValue(null);
      await expect(service.getFilePath('merchant-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('makes the PDF first when it was never made, or the file has gone', async () => {
      noteRepository.findById.mockResolvedValue({ ...full, pdfPath: 'gone.pdf' });
      storage.fileExists.mockResolvedValue(false);

      await service.getFilePath('merchant-1', 'note-1');

      expect(pdfService.generateNote).toHaveBeenCalledTimes(1);
      expect(noteRepository.setPdfPath).toHaveBeenCalled();
    });
  });

  it('lists the notes on an invoice and a merchant’s notes', async () => {
    await service.listForInvoice('inv-1');
    await service.listForMerchant('merchant-1', 2, 10);

    expect(noteRepository.findByInvoice).toHaveBeenCalledWith('inv-1');
    expect(noteRepository.findByMerchant).toHaveBeenCalledWith('merchant-1', 2, 10);
  });
});
