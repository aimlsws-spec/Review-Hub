import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class SupportMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SupportMessageCreateInput) {
    return this.prisma.supportMessage.create({ data });
  }

  async findByTicket(ticketId: string) {
    return this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
