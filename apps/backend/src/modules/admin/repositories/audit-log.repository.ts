import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; entity?: string; actorId?: string; action?: AuditAction }) {
    const { page, limit, entity, actorId, action } = params;
    const where: Prisma.AuditLogWhereInput = {};
    if (entity) where.entity = entity;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
