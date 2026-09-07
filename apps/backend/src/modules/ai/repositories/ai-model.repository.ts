import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AiModelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AIModelCreateInput) {
    return this.prisma.aIModel.create({ data });
  }

  async softDelete(id: string) {
    return this.prisma.aIModel.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
