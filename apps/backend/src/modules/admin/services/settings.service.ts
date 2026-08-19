import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateSystemSettingDto, UpdateSystemSettingDto } from '../dto';
import { SystemSettingRepository } from '../repositories';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingRepository: SystemSettingRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(category?: string) {
    return this.settingRepository.findAll(category);
  }

  async getByKey(key: string) {
    const setting = await this.settingRepository.findByKey(key);
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async create(dto: CreateSystemSettingDto, adminId: string) {
    const existing = await this.settingRepository.findByKey(dto.key);
    if (existing) throw new BadRequestException('A setting with this key already exists');

    const setting = await this.settingRepository.create({
      key: dto.key,
      value: dto.value as Prisma.InputJsonValue,
      dataType: dto.dataType,
      category: dto.category,
      description: dto.description,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SystemSetting',
      entityId: setting.id,
      action: 'CREATE',
      after: { key: setting.key, value: dto.value as Prisma.InputJsonValue },
    });

    return setting;
  }

  async update(key: string, dto: UpdateSystemSettingDto, adminId: string) {
    const before = await this.getByKey(key);
    if (!before.editable) throw new BadRequestException('This setting is not editable');

    const updated = await this.settingRepository.update(key, {
      value: dto.value as Prisma.InputJsonValue,
      description: dto.description,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SystemSetting',
      entityId: before.id,
      action: 'CONFIG_CHANGE',
      before: { value: before.value },
      after: { value: dto.value as Prisma.InputJsonValue },
    });

    return updated;
  }
}
