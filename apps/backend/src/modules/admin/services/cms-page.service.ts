import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CmsPageQueryDto, CreateCmsPageDto, UpdateCmsPageDto } from '../dto';
import { CmsPageRepository } from '../repositories';

@Injectable()
export class CmsPageService {
  constructor(
    private readonly cmsPageRepository: CmsPageRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: CmsPageQueryDto) {
    return this.cmsPageRepository.findAll({ page: query.page, limit: query.limit, status: query.status });
  }

  async getById(id: string) {
    const page = await this.cmsPageRepository.findById(id);
    if (!page) throw new NotFoundException('CMS page not found');
    return page;
  }

  async create(dto: CreateCmsPageDto, adminId: string) {
    const existing = await this.cmsPageRepository.findBySlug(dto.slug);
    if (existing) throw new BadRequestException('A page with this slug already exists');

    const page = await this.cmsPageRepository.create({
      title: dto.title,
      slug: dto.slug,
      content: dto.content,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      status: dto.status ?? 'DRAFT',
      publishedAt: dto.status === 'PUBLISHED' ? new Date() : undefined,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'CMSPage',
      entityId: page.id,
      action: 'CREATE',
      after: { title: page.title, slug: page.slug, status: page.status },
    });

    return page;
  }

  async update(id: string, dto: UpdateCmsPageDto, adminId: string) {
    const before = await this.getById(id);
    const becomingPublished = dto.status === 'PUBLISHED' && before.status !== 'PUBLISHED';

    const updated = await this.cmsPageRepository.update(id, {
      ...dto,
      updatedBy: adminId,
      publishedAt: becomingPublished ? new Date() : undefined,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'CMSPage',
      entityId: id,
      action: 'UPDATE',
      before: { status: before.status },
      after: { status: updated.status },
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.cmsPageRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'CMSPage',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }
}
