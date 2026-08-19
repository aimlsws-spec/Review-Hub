import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantTeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchantId(merchantId: string) {
    return this.prisma.merchantTeam.findMany({
      where: { merchantId, deletedAt: null },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.merchantTeam.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
    });
  }

  async findByMerchantAndUser(merchantId: string, userId: string) {
    return this.prisma.merchantTeam.findFirst({
      where: { merchantId, userId, deletedAt: null },
    });
  }

  async countByMerchantId(merchantId: string) {
    return this.prisma.merchantTeam.count({ where: { merchantId, deletedAt: null } });
  }

  async create(data: Prisma.MerchantTeamCreateInput) {
    return this.prisma.merchantTeam.create({ data });
  }

  async update(id: string, data: Prisma.MerchantTeamUpdateInput) {
    return this.prisma.merchantTeam.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.merchantTeam.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'REMOVED' },
    });
  }
}
