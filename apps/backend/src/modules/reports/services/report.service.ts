import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateReportDto, CreateReportScheduleDto, ReportQueryDto } from '../dto';
import { ReportRepository, ReportScheduleRepository } from '../repositories';

@Injectable()
export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly scheduleRepository: ReportScheduleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: ReportQueryDto) {
    return this.reportRepository.findAll({
      page: query.page,
      limit: query.limit,
      reportType: query.reportType,
      status: query.status,
    });
  }

  async getById(id: string) {
    const report = await this.reportRepository.findById(id);
    if (!report) throw new NotFoundException('Report');
    return report;
  }

  /** Registers the request; actual file generation is queued/run by whatever report generator consumes PENDING reports. */
  async create(dto: CreateReportDto, adminId: string) {
    const report = await this.reportRepository.create({
      name: dto.name,
      reportType: dto.reportType,
      generatedBy: adminId,
      filters: dto.filters as Prisma.InputJsonValue,
      status: 'PENDING',
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'Report',
      entityId: report.id,
      action: 'CREATE',
      after: { name: report.name, reportType: report.reportType },
    });

    return report;
  }

  async markStarted(id: string) {
    await this.getById(id);
    return this.reportRepository.update(id, { status: 'PROCESSING', startedAt: new Date() });
  }

  async markCompleted(id: string, fileId: string) {
    await this.getById(id);
    return this.reportRepository.update(id, { status: 'COMPLETED', completedAt: new Date(), fileId });
  }

  async markFailed(id: string) {
    await this.getById(id);
    return this.reportRepository.update(id, { status: 'FAILED', completedAt: new Date() });
  }

  async setSchedule(reportId: string, dto: CreateReportScheduleDto, adminId: string) {
    await this.getById(reportId);
    const existing = await this.scheduleRepository.findByReport(reportId);
    if (existing) throw new BadRequestException('This report already has a schedule');

    const schedule = await this.scheduleRepository.create({
      report: { connect: { id: reportId } },
      frequency: dto.frequency,
      nextRun: new Date(dto.nextRun),
      recipients: dto.recipients,
      active: dto.active ?? true,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'ReportSchedule',
      entityId: schedule.id,
      action: 'CREATE',
      after: { reportId, frequency: dto.frequency },
    });

    return schedule;
  }

  async updateSchedule(reportId: string, dto: Partial<CreateReportScheduleDto>) {
    const existing = await this.scheduleRepository.findByReport(reportId);
    if (!existing) throw new NotFoundException('Report schedule');

    return this.scheduleRepository.update(reportId, {
      frequency: dto.frequency,
      nextRun: dto.nextRun ? new Date(dto.nextRun) : undefined,
      recipients: dto.recipients,
      active: dto.active,
    });
  }
}
