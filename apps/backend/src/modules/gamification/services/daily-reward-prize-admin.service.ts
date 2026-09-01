import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateDailyRewardPrizeDto, DailyRewardPrizeQueryDto, UpdateDailyRewardPrizeDto } from '../dto';
import { DailyRewardPrizeRepository } from '../repositories';

@Injectable()
export class DailyRewardPrizeAdminService {
  constructor(
    private readonly prizeRepository: DailyRewardPrizeRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: DailyRewardPrizeQueryDto) {
    return this.prizeRepository.findAll({ page: query.page, limit: query.limit, isActive: query.isActive });
  }

  async getById(id: string) {
    const prize = await this.prizeRepository.findById(id);
    if (!prize) throw new NotFoundException('Daily reward prize');
    return prize;
  }

  async create(dto: CreateDailyRewardPrizeDto, adminId: string) {
    const prize = await this.prizeRepository.create(dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'DailyRewardPrize',
      entityId: prize.id,
      action: 'CREATE',
      after: { label: prize.label, amount: prize.amount.toString(), weight: prize.weight },
    });

    return prize;
  }

  async update(id: string, dto: UpdateDailyRewardPrizeDto, adminId: string) {
    await this.getById(id);
    const updated = await this.prizeRepository.update(id, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'DailyRewardPrize',
      entityId: id,
      action: 'UPDATE',
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.prizeRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'DailyRewardPrize',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }
}
