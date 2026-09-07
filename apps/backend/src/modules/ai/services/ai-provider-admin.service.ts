import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ConflictException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateAiModelDto, CreateAiPromptTemplateDto, CreateAiProviderDto, UpdateAiProviderDto } from '../dto';
import { AiModelRepository, AiPromptTemplateRepository, AiProviderRepository, AiUsageLogRepository } from '../repositories';

@Injectable()
export class AiProviderAdminService {
  constructor(
    private readonly providerRepository: AiProviderRepository,
    private readonly modelRepository: AiModelRepository,
    private readonly promptRepository: AiPromptTemplateRepository,
    private readonly usageLogRepository: AiUsageLogRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list() {
    return this.providerRepository.findAll();
  }

  async getById(id: string) {
    const provider = await this.providerRepository.findById(id);
    if (!provider) throw new NotFoundException('AI provider');
    return provider;
  }

  async create(dto: CreateAiProviderDto, adminId: string) {
    const existing = await this.providerRepository.findByName(dto.name);
    if (existing) throw new ConflictException('AI provider', 'name');

    const provider = await this.providerRepository.create({
      name: dto.name,
      provider: dto.provider,
      apiEndpoint: dto.apiEndpoint,
      model: dto.model,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      timeout: dto.timeout ?? 30000,
      configuration: dto.configuration as Prisma.InputJsonValue,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'AIProvider',
      entityId: provider.id,
      action: 'CREATE',
      after: { name: provider.name, provider: provider.provider },
    });

    return provider;
  }

  async update(id: string, dto: UpdateAiProviderDto, adminId: string) {
    await this.getById(id);
    const updated = await this.providerRepository.update(id, {
      apiEndpoint: dto.apiEndpoint,
      model: dto.model,
      enabled: dto.enabled,
      priority: dto.priority,
      timeout: dto.timeout,
      configuration: dto.configuration as Prisma.InputJsonValue,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'AIProvider',
      entityId: id,
      action: 'UPDATE',
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.providerRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'AIProvider',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }

  async addModel(providerId: string, dto: CreateAiModelDto) {
    await this.getById(providerId);
    return this.modelRepository.create({
      provider: { connect: { id: providerId } },
      modelName: dto.modelName,
      version: dto.version,
      maxTokens: dto.maxTokens ?? 4096,
      temperature: dto.temperature ?? 0.7,
      enabled: dto.enabled ?? true,
    });
  }

  async removeModel(modelId: string) {
    return this.modelRepository.softDelete(modelId);
  }

  async addPromptTemplate(providerId: string, dto: CreateAiPromptTemplateDto) {
    await this.getById(providerId);
    return this.promptRepository.create({
      provider: { connect: { id: providerId } },
      name: dto.name,
      prompt: dto.prompt,
      version: dto.version ?? '1.0',
      active: dto.active ?? true,
    });
  }

  async removePromptTemplate(templateId: string) {
    return this.promptRepository.softDelete(templateId);
  }

  async listUsageLogs(providerId: string, page: number, limit: number) {
    await this.getById(providerId);
    return this.usageLogRepository.findByProvider(providerId, page, limit);
  }
}
