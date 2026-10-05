import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import * as PDFDocument from 'pdfkit';

import { csvCell } from '@common/utils/csv.util';

import { ReportExportFormat } from '../dto/report-export-query.dto';

import { MerchantAnalyticsOverview, MerchantAnalyticsService } from './merchant-analytics.service';

export interface ReportFile {
  filename: string;
  contentType: string;
  content: Buffer;
}

const CONTENT_TYPES: Record<ReportExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const percent = (rate: number) => `${(rate * 100).toFixed(1)}%`;
const money = (amount: number | null) => (amount === null ? '' : amount.toFixed(2));

/**
 * The merchant campaign report as a downloadable file (spec §9.7 "Export: PDF, Excel, CSV"). It holds exactly what the
 * merchant portal's Analytics page shows (same service, same India-day periods), except that it lists every campaign
 * rather than the top twenty, so a download never disagrees with the screen it was taken from.
 */
@Injectable()
export class MerchantReportExportService {
  constructor(private readonly analytics: MerchantAnalyticsService) {}

  async export(merchantId: string, days: number, format: ReportExportFormat, now: Date = new Date()): Promise<ReportFile> {
    const report = await this.analytics.overview(merchantId, days, now, Infinity);
    const filename = `campaign-report-${report.period.from}-to-${report.period.to}.${format}`;
    const content = format === 'xlsx' ? await this.toXlsx(report) : format === 'pdf' ? await this.toPdf(report) : this.toCsv(report);
    return { filename, contentType: CONTENT_TYPES[format], content };
  }

  /** Three sections one after another, separated by a blank line, so it still reads well in a plain text editor. */
  toCsv(report: MerchantAnalyticsOverview): Buffer {
    const row = (cells: (string | number)[]) => cells.map((cell) => (typeof cell === 'number' ? String(cell) : csvCell(cell))).join(',');
    const lines = [
      row(['Campaign report', `${report.period.from} to ${report.period.to} (India time)`]),
      '',
      row(['Summary', 'Value']),
      ...this.summary(report).map(([label, value]) => row([label, value])),
      '',
      row(['Campaign', 'Status', 'Joined', 'Finished', 'Completion rate', 'Completed tasks', 'Rewards paid (INR)', 'Budget spent (INR)', 'Total budget (INR)', 'Cost per completion (INR)']),
      ...report.campaigns.map((c) =>
        row([c.title, c.status, c.joins, c.finished, percent(c.completionRate), c.completions, money(c.rewardsPaid), money(c.spentBudget), money(c.totalBudget), money(c.costPerCompletion)]),
      ),
      '',
      row(['Date', 'Joined', 'Completed tasks', 'Rewards paid (INR)']),
      ...report.daily.map((d) => row([d.date, d.joins, d.completions, money(d.rewardsPaid)])),
    ];
    // A byte-order mark so Excel opens the file as UTF-8 and campaign titles in Hindi or Gujarati come out right.
    return Buffer.from(`\uFEFF${lines.join('\r\n')}\r\n`, 'utf8');
  }

  /** One sheet per section, with real numbers (not text) so the merchant can sum and chart them. */
  async toXlsx(report: MerchantAnalyticsOverview): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'Viralkar';
    workbook.created = new Date();

    const summary = workbook.addWorksheet('Summary');
    summary.columns = [{ header: 'Summary', key: 'label', width: 32 }, { header: 'Value', key: 'value', width: 24 }];
    summary.addRow({ label: 'Period', value: `${report.period.from} to ${report.period.to} (India time)` });
    this.summary(report).forEach(([label, value]) => summary.addRow({ label, value }));

    const campaigns = workbook.addWorksheet('Campaigns');
    campaigns.columns = [
      { header: 'Campaign', key: 'title', width: 36 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Joined', key: 'joins', width: 10 },
      { header: 'Finished', key: 'finished', width: 10 },
      { header: 'Completion rate', key: 'completionRate', width: 16, style: { numFmt: '0.0%' } },
      { header: 'Completed tasks', key: 'completions', width: 16 },
      { header: 'Rewards paid (INR)', key: 'rewardsPaid', width: 18, style: { numFmt: '#,##0.00' } },
      { header: 'Budget spent (INR)', key: 'spentBudget', width: 18, style: { numFmt: '#,##0.00' } },
      { header: 'Total budget (INR)', key: 'totalBudget', width: 18, style: { numFmt: '#,##0.00' } },
      { header: 'Cost per completion (INR)', key: 'costPerCompletion', width: 24, style: { numFmt: '#,##0.00' } },
    ];
    report.campaigns.forEach((c) => campaigns.addRow({ ...c, costPerCompletion: c.costPerCompletion ?? undefined }));

    const daily = workbook.addWorksheet('Daily');
    daily.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Joined', key: 'joins', width: 10 },
      { header: 'Completed tasks', key: 'completions', width: 16 },
      { header: 'Rewards paid (INR)', key: 'rewardsPaid', width: 18, style: { numFmt: '#,##0.00' } },
    ];
    report.daily.forEach((d) => daily.addRow(d));

    for (const sheet of [summary, campaigns, daily]) sheet.getRow(1).font = { bold: true };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * A printable summary. The built-in PDF fonts have no rupee sign, so amounts say "Rs" as the GST invoices do. The
   * daily table is left to the CSV/Excel files: 90 rows of numbers is not something anyone reads on paper.
   */
  toPdf(report: MerchantAnalyticsOverview): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Campaign report');
      doc.fontSize(10).fillColor('#555555').text(`${report.period.from} to ${report.period.to} (India time)`).fillColor('#000000');
      doc.moveDown();

      doc.fontSize(12).text('Summary');
      doc.fontSize(10);
      this.summary(report).forEach(([label, value]) => doc.text(`${label}: ${String(value).replace(/^INR /, 'Rs ')}`));
      doc.moveDown();

      doc.fontSize(12).text('Campaigns');
      doc.moveDown(0.3);
      if (report.campaigns.length === 0) doc.fontSize(10).text('No campaigns yet.');
      report.campaigns.forEach((c) => {
        if (doc.y > doc.page.height - 100) doc.addPage();
        doc.fontSize(10).font('Helvetica-Bold').text(c.title).font('Helvetica');
        doc.fontSize(9).text(
          `${c.status}  |  Joined ${c.joins}  |  Finished ${c.finished} (${percent(c.completionRate)})  |  Tasks ${c.completions}  |  ` +
            `Rewards Rs ${money(c.rewardsPaid)}  |  Spent Rs ${money(c.spentBudget)} of Rs ${money(c.totalBudget)}` +
            (c.costPerCompletion === null ? '' : `  |  Rs ${money(c.costPerCompletion)} per task`),
        );
        doc.moveDown(0.4);
      });

      doc.end();
    });
  }

  private summary(report: MerchantAnalyticsOverview): [string, string | number][] {
    const { totals } = report;
    return [
      ['Campaigns', totals.campaigns],
      ['Active campaigns', totals.activeCampaigns],
      ['People who joined', totals.joins],
      ['People who finished', totals.finished],
      ['Completion rate', percent(totals.completionRate)],
      ['Completed tasks', totals.completions],
      ['Rewards paid', `INR ${money(totals.rewardsPaid)}`],
      ['Budget spent', `INR ${money(totals.budgetSpent)}`],
      ['Cost per completed task', totals.costPerCompletion === null ? 'n/a' : `INR ${money(totals.costPerCompletion)}`],
    ];
  }
}
