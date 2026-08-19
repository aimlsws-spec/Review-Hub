import { Injectable } from '@nestjs/common';
import { CMSPageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CmsPageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; status?: CMSPageStatus }) {
    const { page, limit, status } = params;
    const where: Prisma.CMSPageWhereInput = { deletedAt: null };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.cMSPage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.cMSPage.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.cMSPage.findFirst({ where: { id, deletedAt: null } });
  }

  async findBySlug(slug: string) {
    return this.prisma.cMSPage.findUnique({ where: { slug } });
  }

  async create(data: Prisma.CMSPageCreateInput) {
    return this.prisma.cMSPage.create({ data });
  }

  async update(id: string, data: Prisma.CMSPageUpdateInput) {
    return this.prisma.cMSPage.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.cMSPage.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
