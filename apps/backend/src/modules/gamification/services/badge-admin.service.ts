import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { BadgeQueryDto, CreateBadgeDto, UpdateBadgeDto } from '../dto';
import { BadgeRepository } from '../repositories';

@Injectable()
export class BadgeAdminService {
  constructor(
    private readonly badgeRepository: BadgeRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: BadgeQueryDto) {
    return this.badgeRepository.findAll({ page: query.page, limit: query.limit, isActive: query.isActive });
  }

  async getById(id: string) {
    const badge = await this.badgeRepository.findById(id);
    if (!badge) throw new NotFoundException('Badge');
    return badge;
  }

  async create(dto: CreateBadgeDto, adminId: string) {
    const badge = await this.badgeRepository.create(dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'Badge',
      entityId: badge.id,
      action: 'CREATE',
      after: { code: badge.code, name: badge.name },
    });

    return badge;
  }

  async update(id: string, dto: UpdateBadgeDto, adminId: string) {
    await this.getById(id);
    const updated = await this.badgeRepository.update(id, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'Badge',
      entityId: id,
      action: 'UPDATE',
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.badgeRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'Badge',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }
}
