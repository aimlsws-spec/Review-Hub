import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CityQueryDto, CreateCityDto, UpdateCityDto } from '../dto';
import { CityRepository } from '../repositories';

/** The starter city list (see prisma/seed-data/india-locations.ts) needs filling out over time. This lets an admin do it without a redeploy. */
@Injectable()
export class CityService {
  constructor(
    private readonly cityRepository: CityRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listStates() {
    return this.cityRepository.findAllStates();
  }

  async list(query: CityQueryDto) {
    return this.cityRepository.findAll({
      page: query.page,
      limit: query.limit,
      stateId: query.stateId,
      includeInactive: query.includeInactive,
    });
  }

  async create(dto: CreateCityDto, adminId: string) {
    const state = await this.cityRepository.findState(dto.stateId);
    if (!state) throw new NotFoundException('State');

    const city = await this.cityRepository.create({
      name: dto.name,
      state: { connect: { id: dto.stateId } },
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'City',
      entityId: city.id,
      action: 'CREATE',
      after: { name: city.name, stateId: dto.stateId },
    });

    return city;
  }

  async update(id: string, dto: UpdateCityDto, adminId: string) {
    const existing = await this.cityRepository.findById(id);
    if (!existing) throw new NotFoundException('City');

    const updated = await this.cityRepository.update(id, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'City',
      entityId: id,
      action: 'UPDATE',
      before: { name: existing.name, isActive: existing.isActive },
      after: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }
}
