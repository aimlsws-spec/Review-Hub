import { Injectable } from '@nestjs/common';

import { AuditLogQueryDto } from '../dto';
import { AuditLogRepository } from '../repositories';

@Injectable()
export class AuditLogViewerService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async list(query: AuditLogQueryDto) {
    return this.auditLogRepository.findAll({
      page: query.page,
      limit: query.limit,
      entity: query.entity,
      actorId: query.actorId,
      action: query.action,
    });
  }
}
