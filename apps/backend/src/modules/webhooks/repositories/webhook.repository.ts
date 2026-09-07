import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchant(merchantId: string) {
    return this.prisma.webhook.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.webhook.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: Prisma.WebhookCreateInput) {
    return this.prisma.webhook.create({ data });
  }

  async update(id: string, data: Prisma.WebhookUpdateInput) {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.webhook.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
