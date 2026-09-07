import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class WebhookDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WebhookDeliveryCreateInput) {
    return this.prisma.webhookDelivery.create({ data });
  }

  async findByWebhook(webhookId: string, page: number, limit: number) {
    const where: Prisma.WebhookDeliveryWhereInput = { webhookId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
