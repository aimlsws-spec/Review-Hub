import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AiProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aIProvider.findMany({
      where: { deletedAt: null },
      orderBy: { priority: 'asc' },
      include: { models: true, prompts: true },
    });
  }

  async findById(id: string) {
    return this.prisma.aIProvider.findFirst({
      where: { id, deletedAt: null },
      include: { models: true, prompts: true },
    });
  }

  async findByName(name: string) {
    return this.prisma.aIProvider.findFirst({ where: { name, deletedAt: null } });
  }

  async create(data: Prisma.AIProviderCreateInput) {
    return this.prisma.aIProvider.create({ data });
  }

  async update(id: string, data: Prisma.AIProviderUpdateInput) {
    return this.prisma.aIProvider.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.aIProvider.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
