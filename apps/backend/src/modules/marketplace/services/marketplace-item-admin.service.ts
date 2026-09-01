import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateMarketplaceItemDto, MarketplaceItemQueryDto, UpdateMarketplaceItemDto } from '../dto';
import { MarketplaceItemRepository, RedemptionRepository } from '../repositories';

@Injectable()
export class MarketplaceItemAdminService {
  constructor(
    private readonly itemRepository: MarketplaceItemRepository,
    private readonly redemptionRepository: RedemptionRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: MarketplaceItemQueryDto) {
    return this.itemRepository.findAll({ page: query.page, limit: query.limit, category: query.category, isActive: query.isActive });
  }

  async getById(id: string) {
    const item = await this.itemRepository.findById(id);
    if (!item) throw new NotFoundException('Marketplace item');
    return item;
  }

  async create(dto: CreateMarketplaceItemDto, adminId: string) {
    const item = await this.itemRepository.create(dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'MarketplaceItem',
      entityId: item.id,
      action: 'CREATE',
      after: { title: item.title, costAmount: item.costAmount.toString() },
    });

    return item;
  }

  async update(id: string, dto: UpdateMarketplaceItemDto, adminId: string) {
    await this.getById(id);
    const updated = await this.itemRepository.update(id, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'MarketplaceItem',
      entityId: id,
      action: 'UPDATE',
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.itemRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'MarketplaceItem',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }

  async listRedemptions(page: number, limit: number) {
    return this.redemptionRepository.findAll(page, limit);
  }
}
