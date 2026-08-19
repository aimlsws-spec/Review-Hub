import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class FeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.featureFlag.findMany({ where: { deletedAt: null }, orderBy: { key: 'asc' } });
  }

  async findByKey(key: string) {
    return this.prisma.featureFlag.findFirst({ where: { key, deletedAt: null } });
  }

  async create(data: Prisma.FeatureFlagCreateInput) {
    return this.prisma.featureFlag.create({ data });
  }

  async update(key: string, data: Prisma.FeatureFlagUpdateInput) {
    return this.prisma.featureFlag.update({ where: { key }, data });
  }
}
