import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

export interface RecordAuditLogParams {
  actorId: string;
  actorType: 'USER' | 'MERCHANT' | 'ADMIN' | 'SYSTEM';
  entity: string;
  entityId?: string;
  action: AuditAction;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipAddress?: string;
}

/** The one place that writes to AuditLog, so every admin-facing mutation is recorded the same way. */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditLogParams) {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorType: params.actorType,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        before: params.before,
        after: params.after,
        ipAddress: params.ipAddress,
      },
    });
  }
}
