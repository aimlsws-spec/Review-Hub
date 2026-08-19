import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class FaqRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; category?: string; isActive?: boolean }) {
    const { page, limit, category, isActive } = params;
    const where: Prisma.FAQWhereInput = { deletedAt: null };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.fAQ.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.fAQ.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.fAQ.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: Prisma.FAQCreateInput) {
    return this.prisma.fAQ.create({ data });
  }

  async update(id: string, data: Prisma.FAQUpdateInput) {
    return this.prisma.fAQ.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.fAQ.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
