import { Injectable } from '@nestjs/common';
import { Prisma, SupportCategory, SupportPriority, SupportTicketStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SupportTicketCreateInput) {
    return this.prisma.supportTicket.create({ data });
  }

  async findById(id: string) {
    return this.prisma.supportTicket.findFirst({
      where: { id, deletedAt: null },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async update(id: string, data: Prisma.SupportTicketUpdateInput) {
    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  async findByUser(params: { userId: string; page: number; limit: number; status?: SupportTicketStatus }) {
    const { userId, page, limit, status } = params;
    const where: Prisma.SupportTicketWhereInput = { userId, deletedAt: null };
    if (status) where.status = status;
    return this.paginate(where, page, limit);
  }

  async findByMerchant(params: { merchantId: string; page: number; limit: number; status?: SupportTicketStatus }) {
    const { merchantId, page, limit, status } = params;
    const where: Prisma.SupportTicketWhereInput = { merchantId, deletedAt: null };
    if (status) where.status = status;
    return this.paginate(where, page, limit);
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: SupportTicketStatus;
    category?: SupportCategory;
    priority?: SupportPriority;
  }) {
    const { page, limit, status, category, priority } = params;
    const where: Prisma.SupportTicketWhereInput = { deletedAt: null };
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    return this.paginate(where, page, limit);
  }

  private async paginate(where: Prisma.SupportTicketWhereInput, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
