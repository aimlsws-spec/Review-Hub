import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class ReportScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByReport(reportId: string) {
    return this.prisma.reportSchedule.findUnique({ where: { reportId } });
  }

  async create(data: Prisma.ReportScheduleCreateInput) {
    return this.prisma.reportSchedule.create({ data });
  }

  async update(reportId: string, data: Prisma.ReportScheduleUpdateInput) {
    return this.prisma.reportSchedule.update({ where: { reportId }, data });
  }
}
