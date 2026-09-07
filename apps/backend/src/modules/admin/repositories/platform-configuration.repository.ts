import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PlatformConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Singleton config row — created on first read with schema defaults if it doesn't exist yet. */
  async getOrCreate() {
    const existing = await this.prisma.platformConfiguration.findFirst({ where: { deletedAt: null } });
    if (existing) return existing;
    return this.prisma.platformConfiguration.create({ data: {} });
  }

  async update(id: string, data: Prisma.PlatformConfigurationUpdateInput) {
    return this.prisma.platformConfiguration.update({ where: { id }, data });
  }
}
