import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ReportCreateInput) {
    return this.prisma.report.create({ data });
  }

  async findById(id: string) {
    return this.prisma.report.findFirst({ where: { id, deletedAt: null }, include: { schedule: true } });
  }

  async findAll(params: { page: number; limit: number; reportType?: Prisma.ReportWhereInput['reportType']; status?: Prisma.ReportWhereInput['status'] }) {
    const { page, limit, reportType, status } = params;
    const where: Prisma.ReportWhereInput = { deletedAt: null };
    if (reportType) where.reportType = reportType;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.report.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async update(id: string, data: Prisma.ReportUpdateInput) {
    return this.prisma.report.update({ where: { id }, data });
  }
}
