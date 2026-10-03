import { Injectable } from '@nestjs/common';

import { ConflictException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../dto';
import { SubscriptionPlanRepository } from '../repositories';

/** The admin side of subscription plans: names, prices and benefits are set here, then a plan is switched on. */
@Injectable()
export class SubscriptionPlanAdminService {
  constructor(
    private readonly planRepository: SubscriptionPlanRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list() {
    const plans = await this.planRepository.findAllWithSubscriberCounts();
    return plans.map(({ _count, ...plan }) => ({ ...plan, subscribers: _count.subscriptions }));
  }

  async create(dto: CreateSubscriptionPlanDto, adminId: string) {
    if (await this.planRepository.findByCode(dto.code)) throw new ConflictException('Subscription plan', 'code');
    const plan = await this.planRepository.create({ ...dto, maxActiveCampaigns: dto.maxActiveCampaigns ?? null });
    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SubscriptionPlan',
      entityId: plan.id,
      action: 'CREATE',
      after: { ...dto },
    });
    return plan;
  }

  /** A new price applies to each subscriber from their next renewal; the period they paid for is not changed. */
  async update(planId: string, dto: UpdateSubscriptionPlanDto, adminId: string) {
    const before = await this.planRepository.findById(planId);
    if (!before) throw new NotFoundException('Subscription plan');
    const plan = await this.planRepository.update(planId, dto);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SubscriptionPlan',
      entityId: planId,
      action: 'UPDATE',
      before: { monthlyPrice: Number(before.monthlyPrice), isActive: before.isActive, featuredSlots: before.featuredSlots },
      after: { ...dto },
    });
    return plan;
  }
}
