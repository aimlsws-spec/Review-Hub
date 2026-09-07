import { Injectable } from '@nestjs/common';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UpdatePlatformConfigurationDto } from '../dto';
import { PlatformConfigurationRepository } from '../repositories';

@Injectable()
export class PlatformConfigurationService {
  constructor(
    private readonly platformConfigurationRepository: PlatformConfigurationRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async get() {
    return this.platformConfigurationRepository.getOrCreate();
  }

  async update(dto: UpdatePlatformConfigurationDto, adminId: string) {
    const existing = await this.get();
    const updated = await this.platformConfigurationRepository.update(existing.id, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'PlatformConfiguration',
      entityId: existing.id,
      action: 'CONFIG_CHANGE',
      after: { ...dto },
    });

    return updated;
  }
}
