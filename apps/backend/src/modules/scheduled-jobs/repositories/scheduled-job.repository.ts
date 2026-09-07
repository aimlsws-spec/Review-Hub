import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class ScheduledJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.scheduledJob.findMany({ where: { deletedAt: null }, orderBy: { jobName: 'asc' } });
  }

  async findById(id: string) {
    return this.prisma.scheduledJob.findFirst({ where: { id, deletedAt: null } });
  }

  async findByName(jobName: string) {
    return this.prisma.scheduledJob.findFirst({ where: { jobName, deletedAt: null } });
  }

  async create(data: Prisma.ScheduledJobCreateInput) {
    return this.prisma.scheduledJob.create({ data });
  }

  async update(id: string, data: Prisma.ScheduledJobUpdateInput) {
    return this.prisma.scheduledJob.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.scheduledJob.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
