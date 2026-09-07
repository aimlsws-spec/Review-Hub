import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AiPromptTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AIPromptTemplateCreateInput) {
    return this.prisma.aIPromptTemplate.create({ data });
  }

  async softDelete(id: string) {
    return this.prisma.aIPromptTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
