import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { FraudFlagQueryDto } from '../dto';
import { FraudFlagRepository } from '../repositories';

@Injectable()
export class FraudReviewService {
  constructor(
    private readonly fraudFlagRepository: FraudFlagRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: FraudFlagQueryDto) {
    return this.fraudFlagRepository.findAll({
      page: query.page,
      limit: query.limit,
      resolved: query.resolved,
      riskLevel: query.riskLevel,
    });
  }

  async resolve(flagId: string, adminId: string) {
    const flag = await this.fraudFlagRepository.findById(flagId);
    if (!flag) throw new NotFoundException('Fraud flag');
    if (flag.resolved) throw new BadRequestException('Fraud flag is already resolved');

    const updated = await this.fraudFlagRepository.resolve(flagId, adminId);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SubmissionFraudFlag',
      entityId: flagId,
      action: 'UPDATE',
      before: { resolved: false },
      after: { resolved: true },
    });

    return updated;
  }
}
