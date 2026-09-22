import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { csvCell, TdsReportService } from './tds-report.service';

describe('TdsReportService', () => {
  const prisma = {
    tdsDeduction: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    user: { findMany: jest.fn() },
  };
  let service: TdsReportService;

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'tds-1',
    withdrawalId: 'wd-1',
    userId: 'user-1',
    financialYear: '2026-27',
    panNumber: 'ABCDE1234F',
    section: '194R',
    grossAmount: { toString: () => '5000.00' },
    rate: { toString: () => '0.1000' },
    tdsAmount: { toString: () => '500.00' },
    netAmount: { toString: () => '4500.00' },
    status: 'DEDUCTED',
    createdAt: new Date('2026-09-21T10:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.tdsDeduction.findMany.mockResolvedValue([row()]);
    prisma.tdsDeduction.count.mockResolvedValue(1);
    prisma.tdsDeduction.aggregate.mockResolvedValue({ _count: 1, _sum: { grossAmount: '5000.00', tdsAmount: '500.00' } });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', firstName: 'Asha', lastName: 'Patel' }]);
    service = new TdsReportService(prisma as never);
  });

  describe('list', () => {
    it('lists a financial year with the deductee name and totals', async () => {
      const result = await service.list({ financialYear: '2026-27', page: 1, limit: 20 });

      expect(result.data[0]).toMatchObject({ withdrawalId: 'wd-1', userName: 'Asha Patel' });
      expect(result.summary).toEqual({ deductions: 1, grossPaid: 5000, tdsKeptBack: 500 });
      expect(result.financialYear).toBe('2026-27');
    });

    it('leaves reversed deductions out of the totals, whatever is being listed', async () => {
      await service.list({ financialYear: '2026-27', status: 'REVERSED', page: 1, limit: 20 });

      expect(prisma.tdsDeduction.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { financialYear: '2026-27', status: 'DEDUCTED' } }));
    });

    it('filters by status when asked, and pages', async () => {
      await service.list({ financialYear: '2026-27', status: 'REVERSED', page: 3, limit: 10 });

      expect(prisma.tdsDeduction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { financialYear: '2026-27', status: 'REVERSED' }, skip: 20, take: 10 }));
    });

    it('defaults to the current financial year', async () => {
      const result = await service.list({ page: 1, limit: 20 });
      expect(result.financialYear).toMatch(/^\d{4}-\d{2}$/);
    });

    it('does not look up names when there is nothing to name', async () => {
      prisma.tdsDeduction.findMany.mockResolvedValue([]);

      await service.list({ financialYear: '2026-27', page: 1, limit: 20 });

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it.each(['2026', '2026-2027', '26-27', '2026-28', 'abcd-ef', '2026/27'])('refuses the financial year "%s"', async (financialYear) => {
      await expect(service.list({ financialYear, page: 1, limit: 20 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('exportCsv', () => {
    it('writes a header and a row per deduction, ready for the return', async () => {
      const { filename, content } = await service.exportCsv('2026-27');
      const [header, line] = content.trim().split('\r\n');

      expect(filename).toBe('tds-2026-27.csv');
      expect(header).toBe('Financial year,Date,Deductee,PAN,Section,Amount paid,Rate,TDS,Paid to user,Status,Withdrawal');
      expect(line).toBe('2026-27,2026-09-21,Asha Patel,ABCDE1234F,194R,5000.00,0.1000,500.00,4500.00,DEDUCTED,wd-1');
    });

    it('lists the oldest first, and still lists reversed ones, marked as such', async () => {
      await service.exportCsv('2026-27');

      expect(prisma.tdsDeduction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { financialYear: '2026-27' }, orderBy: { createdAt: 'asc' } }));
    });

    it('copes with a missing PAN or name', async () => {
      prisma.tdsDeduction.findMany.mockResolvedValue([row({ panNumber: null, userId: 'gone' })]);

      const { content } = await service.exportCsv('2026-27');

      expect(content).toContain('2026-09-21,,,194R');
    });

    it('does not let a name run as a spreadsheet formula', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'user-1', firstName: '=HYPERLINK("http://evil")', lastName: 'x' }]);

      const { content } = await service.exportCsv('2026-27');

      expect(content).toContain(`"'=HYPERLINK(""http://evil"") x"`);
    });
  });
});

describe('csvCell', () => {
  it.each([
    ['plain text', 'Asha Patel', 'Asha Patel'],
    ['a comma', 'Patel, Asha', '"Patel, Asha"'],
    ['a quote', 'say "hi"', '"say ""hi"""'],
    ['a new line', 'a\nb', '"a\nb"'],
    ['a leading =', '=1+1', "'=1+1"],
    ['a leading +', '+91 98', "'+91 98"],
    ['a leading -', '-5', "'-5"],
    ['a leading @', '@cmd', "'@cmd"],
    ['nothing', '', ''],
  ])('%s', (_label, input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });
});
