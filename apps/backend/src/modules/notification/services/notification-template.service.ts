import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { slugify } from '@common/utils';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MESSAGE_VARIABLES } from '../constants';
import { CreateNotificationTemplateDto, UpdateNotificationTemplateDto } from '../dto';
import { NotificationTemplateRepository } from '../repositories';
import { assertSupportedPlaceholders } from '../utils/message-template.util';

/** How many "-2", "-3"... suffixes to try before giving up on finding a free slug. */
const MAX_SLUG_ATTEMPTS = 50;

/** Reusable messages that an admin can start a broadcast from. */
@Injectable()
export class NotificationTemplateService {
  constructor(
    private readonly templateRepository: NotificationTemplateRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list() {
    return this.templateRepository.list();
  }

  async getById(id: string) {
    const template = await this.templateRepository.findById(id);
    if (!template) throw new NotFoundException('Notification template');
    return template;
  }

  async create(dto: CreateNotificationTemplateDto, adminId: string) {
    assertSupportedPlaceholders(dto.title, dto.body, dto.subject);

    const template = await this.templateRepository.create({
      name: dto.name,
      slug: await this.uniqueSlug(dto.name),
      title: dto.title,
      body: dto.body,
      subject: dto.subject,
      channel: dto.channel ?? 'IN_APP',
      isActive: dto.isActive ?? true,
      variables: [...MESSAGE_VARIABLES],
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'NotificationTemplate',
      entityId: template.id,
      action: 'CREATE',
      after: { name: template.name, slug: template.slug },
    });

    return template;
  }

  async update(id: string, dto: UpdateNotificationTemplateDto, adminId: string) {
    const before = await this.getById(id);
    assertSupportedPlaceholders(dto.title ?? before.title, dto.body ?? before.body, dto.subject);

    const updated = await this.templateRepository.update(id, {
      name: dto.name,
      title: dto.title,
      body: dto.body,
      subject: dto.subject,
      channel: dto.channel,
      isActive: dto.isActive,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'NotificationTemplate',
      entityId: id,
      action: 'UPDATE',
      before: { name: before.name, title: before.title, body: before.body, isActive: before.isActive },
      after: { name: updated.name, title: updated.title, body: updated.body, isActive: updated.isActive },
    });

    return updated;
  }

  /** Soft delete: broadcasts already sent from it are unaffected, since they keep their own copy of the message. */
  async remove(id: string, adminId: string) {
    const template = await this.getById(id);
    await this.templateRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'NotificationTemplate',
      entityId: id,
      action: 'DELETE',
      before: { name: template.name, slug: template.slug },
    });

    return { id };
  }

  /** A readable slug from the name, made unique with a numeric suffix (slug is unique across all templates, deleted or not). */
  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'template';
    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      if (!(await this.templateRepository.slugExists(candidate))) return candidate;
    }
    throw new BadRequestException('Could not generate a unique identifier for this template name. Try a different name.');
  }
}
