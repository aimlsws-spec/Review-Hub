import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class CityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every active state, for the "which state is this city in" picker. States are a complete list; only cities are a starter set. */
  async findAllStates() {
    return this.prisma.state.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async findState(id: string) {
    return this.prisma.state.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  async findAll(params: { page: number; limit: number; stateId?: string; includeInactive?: boolean }) {
    const { page, limit, stateId, includeInactive } = params;
    const where: Prisma.CityWhereInput = {};
    if (stateId) where.stateId = stateId;
    if (!includeInactive) where.isActive = true;

    const [data, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { state: { select: { name: true } } },
      }),
      this.prisma.city.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.city.findUnique({ where: { id } });
  }

  async create(data: Prisma.CityCreateInput) {
    return this.prisma.city.create({ data });
  }

  async update(id: string, data: Prisma.CityUpdateInput) {
    return this.prisma.city.update({ where: { id }, data });
  }
}
