import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SystemSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    return this.prisma.systemSetting.findMany({
      where: { deletedAt: null, ...(category ? { category } : {}) },
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string) {
    return this.prisma.systemSetting.findFirst({ where: { key, deletedAt: null } });
  }

  async create(data: Prisma.SystemSettingCreateInput) {
    return this.prisma.systemSetting.create({ data });
  }

  async update(key: string, data: Prisma.SystemSettingUpdateInput) {
    return this.prisma.systemSetting.update({ where: { key }, data });
  }
}
