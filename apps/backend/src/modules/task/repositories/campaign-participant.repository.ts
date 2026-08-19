import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CampaignParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CampaignParticipantCreateInput) {
    return this.prisma.campaignParticipant.create({ data });
  }

  async findByCampaignAndUser(campaignId: string, userId: string) {
    return this.prisma.campaignParticipant.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
  }

  async update(id: string, data: Prisma.CampaignParticipantUpdateInput) {
    return this.prisma.campaignParticipant.update({ where: { id }, data });
  }
}
