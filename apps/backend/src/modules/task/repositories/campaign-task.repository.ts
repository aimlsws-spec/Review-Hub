import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CampaignTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CampaignTaskCreateInput) {
    return this.prisma.campaignTask.create({ data });
  }

  async findById(id: string) {
    return this.prisma.campaignTask.findFirst({ where: { id, deletedAt: null } });
  }

  async findByCampaignId(campaignId: string) {
    return this.prisma.campaignTask.findMany({
      where: { campaignId, deletedAt: null },
      orderBy: { taskOrder: 'asc' },
    });
  }

  async countActiveByCampaignId(campaignId: string) {
    return this.prisma.campaignTask.count({ where: { campaignId, deletedAt: null } });
  }

  async update(id: string, data: Prisma.CampaignTaskUpdateInput) {
    return this.prisma.campaignTask.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.campaignTask.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
