import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../dto';
import { FeatureFlagRepository } from '../repositories';

@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list() {
    return this.featureFlagRepository.findAll();
  }

  async getByKey(key: string) {
    const flag = await this.featureFlagRepository.findByKey(key);
    if (!flag) throw new NotFoundException('Feature flag');
    return flag;
  }

  async create(dto: CreateFeatureFlagDto, adminId: string) {
    const existing = await this.featureFlagRepository.findByKey(dto.key);
    if (existing) throw new BadRequestException('A feature flag with this key already exists');

    const flag = await this.featureFlagRepository.create(dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'FeatureFlag',
      entityId: flag.id,
      action: 'CREATE',
      after: { key: flag.key, enabled: flag.enabled },
    });

    return flag;
  }

  async update(key: string, dto: UpdateFeatureFlagDto, adminId: string) {
    const before = await this.getByKey(key);
    const updated = await this.featureFlagRepository.update(key, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'FeatureFlag',
      entityId: before.id,
      action: 'CONFIG_CHANGE',
      before: { enabled: before.enabled, rolloutPercentage: before.rolloutPercentage },
      after: { enabled: updated.enabled, rolloutPercentage: updated.rolloutPercentage },
    });

    return updated;
  }
}
