import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ConflictException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateScheduledJobDto, UpdateScheduledJobDto } from '../dto';
import { JobExecutionLogRepository, ScheduledJobRepository } from '../repositories';

@Injectable()
export class ScheduledJobService {
  constructor(
    private readonly jobRepository: ScheduledJobRepository,
    private readonly logRepository: JobExecutionLogRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list() {
    return this.jobRepository.findAll();
  }

  async getById(id: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new NotFoundException('Scheduled job');
    return job;
  }

  async create(dto: CreateScheduledJobDto, adminId: string) {
    const existing = await this.jobRepository.findByName(dto.jobName);
    if (existing) throw new ConflictException('Scheduled job', 'jobName');

    const job = await this.jobRepository.create({
      jobName: dto.jobName,
      jobType: dto.jobType,
      cronExpression: dto.cronExpression,
      enabled: dto.enabled ?? true,
      configuration: dto.configuration as Prisma.InputJsonValue,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'ScheduledJob',
      entityId: job.id,
      action: 'CREATE',
      after: { jobName: job.jobName, cronExpression: job.cronExpression },
    });

    return job;
  }

  async update(id: string, dto: UpdateScheduledJobDto, adminId: string) {
    const before = await this.getById(id);
    const updated = await this.jobRepository.update(id, {
      cronExpression: dto.cronExpression,
      enabled: dto.enabled,
      configuration: dto.configuration as Prisma.InputJsonValue,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'ScheduledJob',
      entityId: id,
      action: 'UPDATE',
      before: { cronExpression: before.cronExpression, enabled: before.enabled },
      after: { cronExpression: dto.cronExpression, enabled: dto.enabled },
    });

    return updated;
  }

  async remove(id: string, adminId: string) {
    await this.getById(id);
    const removed = await this.jobRepository.softDelete(id);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'ScheduledJob',
      entityId: id,
      action: 'DELETE',
    });

    return removed;
  }

  async listExecutionLogs(jobId: string, page: number, limit: number) {
    await this.getById(jobId);
    return this.logRepository.findByJob(jobId, page, limit);
  }
}
