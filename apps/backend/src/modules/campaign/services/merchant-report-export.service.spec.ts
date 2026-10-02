import { Workbook } from 'exceljs';

import { MerchantAnalyticsOverview } from './merchant-analytics.service';
import { MerchantReportExportService } from './merchant-report-export.service';

describe('MerchantReportExportService', () => {
  const report: MerchantAnalyticsOverview = {
    period: { days: 7, from: '2026-09-24', to: '2026-09-30' },
    totals: {
      campaigns: 2,
      activeCampaigns: 1,
      joins: 30,
      finished: 24,
      completionRate: 0.8,
      completions: 40,
      rewardsPaid: 1200,
      budgetSpent: 1250.5,
      costPerCompletion: 30,
    },
    campaigns: [
      { id: 'c1', title: 'Monsoon menu, "honest" reviews', status: 'ACTIVE', joins: 20, finished: 18, completionRate: 0.9, completions: 30, rewardsPaid: 900, spentBudget: 950.5, totalBudget: 5000, costPerCompletion: 30 },
      { id: 'c2', title: '=HYPERLINK("http://evil")', status: 'DRAFT', joins: 10, finished: 6, completionRate: 0.6, completions: 10, rewardsPaid: 300, spentBudget: 300, totalBudget: 1000, costPerCompletion: null },
    ],
    daily: [
      { date: '2026-09-29', joins: 12, completions: 15, rewardsPaid: 450 },
      { date: '2026-09-30', joins: 18, completions: 25, rewardsPaid: 750 },
    ],
  };
  const analytics = { overview: jest.fn() };
  let service: MerchantReportExportService;

  beforeEach(() => {
    jest.resetAllMocks();
    analytics.overview.mockResolvedValue(report);
    service = new MerchantReportExportService(analytics as never);
  });

  it('asks analytics for every campaign in the period, not just the top twenty', async () => {
    const now = new Date('2026-09-30T10:00:00Z');
    await service.export('merchant-1', 7, 'csv', now);
    expect(analytics.overview).toHaveBeenCalledWith('merchant-1', 7, now, Infinity);
  });

  it('names the file after the period and format, with the matching content type', async () => {
    await expect(service.export('merchant-1', 7, 'xlsx')).resolves.toMatchObject({
      filename: 'campaign-report-2026-09-24-to-2026-09-30.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });

  describe('csv', () => {
    it('has the summary, every campaign and every day, quoting commas and quotes', async () => {
      const text = (await service.export('merchant-1', 7, 'csv')).content.toString('utf8');

      expect(text.charCodeAt(0)).toBe(0xfeff);
      expect(text).toContain('Completion rate,80.0%');
      expect(text).toContain('"Monsoon menu, ""honest"" reviews",ACTIVE,20,18,90.0%,30,900.00,950.50,5000.00,30.00');
      expect(text).toContain('2026-09-30,18,25,750.00');
    });

    it('never lets a campaign title run as a spreadsheet formula', async () => {
      const text = (await service.export('merchant-1', 7, 'csv')).content.toString('utf8');
      expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`);
      // No cost per completion yet is an empty cell, not 0.
      expect(text).toMatch(/,1000\.00,\r\n/);
    });
  });

  it('xlsx: three sheets holding real numbers', async () => {
    const workbook = new Workbook();
    await workbook.xlsx.load((await service.export('merchant-1', 7, 'xlsx')).content as never);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Summary', 'Campaigns', 'Daily']);
    // Column keys are not saved in the file, so cells are read by position: 1 title, 8 budget spent, 10 cost per task.
    const campaigns = workbook.getWorksheet('Campaigns')!;
    expect(campaigns.getRow(2).getCell(1).value).toBe('Monsoon menu, "honest" reviews');
    expect(campaigns.getRow(2).getCell(8).value).toBe(950.5);
    expect(campaigns.getRow(3).getCell(10).value).toBeNull();
    expect(workbook.getWorksheet('Daily')!.rowCount).toBe(3);
  });

  it('pdf: produces a PDF document', async () => {
    const file = await service.export('merchant-1', 7, 'pdf');
    expect(file.contentType).toBe('application/pdf');
    expect(file.content.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
