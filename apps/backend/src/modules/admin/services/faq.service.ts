import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateFaqDto, FaqQueryDto, UpdateFaqDto } from '../dto';
import { FaqRepository } from '../repositories';

@Injectable()
export class FaqService {
  constructor(
    private readonly faqRepository: FaqRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: FaqQueryDto) {
    return this.faqRepository.findAll({
      page: query.page,
      limit: query.limit,
      category: query.category,
      isActive: query.isActive,
    });
  }

  async getById(id: string) {
    const faq = await this.faqRepository.findById(id);
    if (!faq) throw new NotFoundException('FAQ');
    return faq;
  }

  async create(dto: CreateFaqDto, adminId: string) {
    const faq = await this.faqRepository.create(dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'FAQ',
      entityId: faq.id,
      action: 'CREATE',
      after: { category: faq.category, question: faq.question },
    });

    return faq;
  }

  async update(id: string, dto: UpdateFaqDto, adminId: string) {
    await this.getById(id);
    const updated = await this.faqRepository.update(id, dto);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'FAQ',
      entityId: id,
      action: 'UPDATE',
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.faqRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'FAQ',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }
}
