import { Prisma } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { InvoiceNoteRepository } from './invoice-note.repository';

describe('InvoiceNoteRepository', () => {
  const tx = {
    $queryRaw: jest.fn(),
    invoice: { findUnique: jest.fn() },
    invoiceNote: { groupBy: jest.fn(), count: jest.fn(), create: jest.fn() },
  };
  const prisma = { transaction: jest.fn(), invoiceNote: { update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() } };
  let repository: InvoiceNoteRepository;

  const invoice = { id: 'inv-1', merchantId: 'merchant-1', taxableAmount: '1000.00', gstRate: '18.00', platformGstNumber: 'PLATFORM', merchantGstNumber: 'MERCHANT' };
  const params = (overrides: Record<string, unknown> = {}) => ({ invoiceId: 'inv-1', type: 'CREDIT' as const, taxableAmount: 400, reason: 'Billed twice', issuedBy: 'admin-1', ...overrides });
  const notes = (credit: number, debit = 0) => {
    const rows = [];
    if (credit) rows.push({ type: 'CREDIT', _sum: { taxableAmount: String(credit) } });
    if (debit) rows.push({ type: 'DEBIT', _sum: { taxableAmount: String(debit) } });
    return rows;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.transaction.mockImplementation((fn: (client: unknown) => unknown) => fn(tx));
    tx.invoice.findUnique.mockResolvedValue(invoice);
    tx.invoiceNote.groupBy.mockResolvedValue([]);
    tx.invoiceNote.count.mockResolvedValue(0);
    tx.invoiceNote.create.mockImplementation(async ({ data }: { data: object }) => ({ id: 'note-1', ...data }));
    repository = new InvoiceNoteRepository(prisma as never);
  });

  it('locks the invoice first, before reading what it is still worth', async () => {
    await repository.issue(params());

    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.invoice.findUnique.mock.invocationCallOrder[0]);
  });

  it('adds GST at the invoice rate and totals it, to the paisa', async () => {
    await repository.issue(params({ taxableAmount: 333.33 }));

    expect(tx.invoiceNote.create.mock.calls[0][0].data).toMatchObject({ taxableAmount: 333.33, gstRate: 18, gstAmount: 60, totalAmount: 393.33, merchantId: 'merchant-1', issuedBy: 'admin-1' });
  });

  it('copies the GST numbers from the invoice, so the note stays as the invoice was', async () => {
    await repository.issue(params());

    expect(tx.invoiceNote.create.mock.calls[0][0].data).toMatchObject({ platformGstNumber: 'PLATFORM', merchantGstNumber: 'MERCHANT' });
  });

  it('refuses an invoice that does not exist', async () => {
    tx.invoice.findUnique.mockResolvedValue(null);
    await expect(repository.issue(params())).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('credit notes can not take off more than the invoice is worth', () => {
    it('allows exactly what is left', async () => {
      tx.invoiceNote.groupBy.mockResolvedValue(notes(600));
      await expect(repository.issue(params({ taxableAmount: 400 }))).resolves.toBeDefined();
    });

    it('refuses a penny more, and says how much is left', async () => {
      tx.invoiceNote.groupBy.mockResolvedValue(notes(600));

      await expect(repository.issue(params({ taxableAmount: 400.01 }))).rejects.toThrow(/at most ₹400\.00 more/);
      expect(tx.invoiceNote.create).not.toHaveBeenCalled();
    });

    it('counts debit notes as adding to what can be credited', async () => {
      tx.invoiceNote.groupBy.mockResolvedValue(notes(1000, 300));
      await expect(repository.issue(params({ taxableAmount: 300 }))).resolves.toBeDefined();
      await expect(repository.issue(params({ taxableAmount: 300.01 }))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('says so plainly once an invoice is credited in full', async () => {
      tx.invoiceNote.groupBy.mockResolvedValue(notes(1000));
      await expect(repository.issue(params({ taxableAmount: 1 }))).rejects.toThrow(/credited in full/);
    });
  });

  it('a debit note has no upper limit from the invoice', async () => {
    tx.invoiceNote.groupBy.mockResolvedValue(notes(1000));
    await expect(repository.issue(params({ type: 'DEBIT', taxableAmount: 50000 }))).resolves.toBeDefined();
  });

  describe('numbering', () => {
    const year = new Date().getFullYear();

    it('numbers credit and debit notes separately, in order', async () => {
      tx.invoiceNote.count.mockResolvedValueOnce(0).mockResolvedValueOnce(6);

      await repository.issue(params());
      await repository.issue(params({ type: 'DEBIT' }));

      expect(tx.invoiceNote.create.mock.calls[0][0].data.noteNumber).toBe(`CN-${year}-000001`);
      expect(tx.invoiceNote.create.mock.calls[1][0].data.noteNumber).toBe(`DN-${year}-000007`);
    });

    const taken = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

    it('tries again with the next number when another note took the number first', async () => {
      tx.invoiceNote.count.mockResolvedValueOnce(4).mockResolvedValueOnce(5);
      tx.invoiceNote.create.mockRejectedValueOnce(taken());

      const note = await repository.issue(params());

      expect(note.noteNumber).toBe(`CN-${year}-000006`);
      expect(tx.invoiceNote.create).toHaveBeenCalledTimes(2);
    });

    it('gives up rather than loop for ever', async () => {
      tx.invoiceNote.create.mockRejectedValue(taken());

      await expect(repository.issue(params())).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect(tx.invoiceNote.create).toHaveBeenCalledTimes(10);
    });

    it('also tries again after losing a deadlock', async () => {
      tx.invoiceNote.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Deadlock', { code: 'P2034', clientVersion: 'test' }));

      await expect(repository.issue(params())).resolves.toBeDefined();
      expect(tx.invoiceNote.create).toHaveBeenCalledTimes(2);
    });

    it('does not hide other errors as a taken number', async () => {
      tx.invoiceNote.create.mockRejectedValue(new Error('database down'));

      await expect(repository.issue(params())).rejects.toThrow('database down');
      expect(tx.invoiceNote.create).toHaveBeenCalledTimes(1);
    });
  });
});
