import { Injectable } from '@nestjs/common';
import { Prisma, TdsStatus } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { financialYearOf } from '../tds';

const FINANCIAL_YEAR_PATTERN = /^\d{4}-\d{2}$/;
const EXPORT_LIMIT = 50_000;

export interface TdsQuery {
  financialYear?: string;
  status?: TdsStatus;
  page: number;
  limit: number;
}

/**
 * What the platform has kept back from user payouts, for its tax returns: a list an admin can browse, totals for a
 * year, and a CSV with a row per deduction (who, their PAN, how much, when).
 */
@Injectable()
export class TdsReportService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TdsQuery) {
    const financialYear = this.resolveYear(query.financialYear);
    const where: Prisma.TdsDeductionWhereInput = { financialYear, ...(query.status ? { status: query.status } : {}) };

    const [rows, total, totals] = await Promise.all([
      this.prisma.tdsDeduction.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.tdsDeduction.count({ where }),
      // Reversed deductions were never really kept back, so the totals leave them out whatever is being listed.
      this.prisma.tdsDeduction.aggregate({ where: { financialYear, status: 'DEDUCTED' }, _sum: { grossAmount: true, tdsAmount: true }, _count: true }),
    ]);

    const names = await this.namesOf(rows.map((row) => row.userId));
    return {
      data: rows.map((row) => ({ ...row, userName: names.get(row.userId) ?? null })),
      total,
      page: query.page,
      limit: query.limit,
      financialYear,
      summary: {
        deductions: totals._count,
        grossPaid: Number(totals._sum.grossAmount ?? 0),
        tdsKeptBack: Number(totals._sum.tdsAmount ?? 0),
      },
    };
  }

  /** One row per deduction, oldest first, ready for whoever files the return. */
  async exportCsv(financialYearInput?: string): Promise<{ filename: string; content: string }> {
    const financialYear = this.resolveYear(financialYearInput);
    const rows = await this.prisma.tdsDeduction.findMany({ where: { financialYear }, orderBy: { createdAt: 'asc' }, take: EXPORT_LIMIT });
    const names = await this.namesOf(rows.map((row) => row.userId));

    const header = ['Financial year', 'Date', 'Deductee', 'PAN', 'Section', 'Amount paid', 'Rate', 'TDS', 'Paid to user', 'Status', 'Withdrawal'];
    const lines = rows.map((row) => [
      row.financialYear,
      row.createdAt.toISOString().slice(0, 10),
      names.get(row.userId) ?? '',
      row.panNumber ?? '',
      row.section,
      Number(row.grossAmount).toFixed(2),
      Number(row.rate).toFixed(4),
      Number(row.tdsAmount).toFixed(2),
      Number(row.netAmount).toFixed(2),
      row.status,
      row.withdrawalId,
    ]);

    return { filename: `tds-${financialYear}.csv`, content: [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n' };
  }

  private resolveYear(input?: string): string {
    if (!input) return financialYearOf(new Date()).label;
    const start = Number(input.slice(0, 4));
    if (!FINANCIAL_YEAR_PATTERN.test(input) || (start + 1) % 100 !== Number(input.slice(5))) {
      throw new BadRequestException('financialYear must look like 2026-27');
    }
    return input;
  }

  private async namesOf(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(userIds)] } }, select: { id: true, firstName: true, lastName: true } });
    return new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim()]));
  }
}

/**
 * A CSV cell, quoted when it needs to be. A cell that starts with =, +, - or @ would be run as a formula by a
 * spreadsheet, and names come from users, so those get a leading apostrophe to be shown as plain text.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
