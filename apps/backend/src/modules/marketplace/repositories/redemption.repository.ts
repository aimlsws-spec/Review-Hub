import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class RedemptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: { userId: string; itemId: string; costAmount: number; redemptionCode: string }) {
    return this.prisma.redemption.create({
      data: {
        user: { connect: { id: params.userId } },
        item: { connect: { id: params.itemId } },
        costAmount: params.costAmount,
        redemptionCode: params.redemptionCode,
      },
      include: { item: true },
    });
  }

  async findByUser(userId: string, page: number, limit: number) {
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.redemption.findMany({
        where,
        include: { item: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.redemption.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findAll(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.redemption.findMany({
        include: { item: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.redemption.count(),
    ]);
    return { data, total, page, limit };
  }
}
