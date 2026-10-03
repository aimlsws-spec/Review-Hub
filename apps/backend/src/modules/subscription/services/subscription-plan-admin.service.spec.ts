import { ConflictException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { SubscriptionPlanRepository } from '../repositories';

import { SubscriptionPlanAdminService } from './subscription-plan-admin.service';

describe('SubscriptionPlanAdminService', () => {
  const planRepository = { findAllWithSubscriberCounts: jest.fn(), findByCode: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn() };
  const auditLogService = { record: jest.fn() };
  const service = new SubscriptionPlanAdminService(
    planRepository as unknown as SubscriptionPlanRepository,
    auditLogService as unknown as AuditLogService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists plans with their subscriber counts', async () => {
    planRepository.findAllWithSubscriberCounts.mockResolvedValue([{ id: 'p-1', name: 'Growth', _count: { subscriptions: 4 } }]);

    await expect(service.list()).resolves.toEqual([{ id: 'p-1', name: 'Growth', subscribers: 4 }]);
  });

  it('creates a plan and audits it, refusing a code already used', async () => {
    planRepository.findByCode.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'p-1' });
    planRepository.create.mockResolvedValue({ id: 'p-2' });
    const dto = { code: 'GOLD', name: 'Gold', monthlyPrice: 1999 };

    await service.create(dto, 'admin-1');
    expect(planRepository.create).toHaveBeenCalledWith({ ...dto, maxActiveCampaigns: null });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'SubscriptionPlan', action: 'CREATE' }));

    await expect(service.create(dto, 'admin-1')).rejects.toThrow(ConflictException);
  });

  it('updates a plan and audits the change', async () => {
    planRepository.findById.mockResolvedValue({ id: 'p-1', monthlyPrice: 999, isActive: false, featuredSlots: 1 });

    await service.update('p-1', { isActive: true }, 'admin-1');

    expect(planRepository.update).toHaveBeenCalledWith('p-1', { isActive: true });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ before: { monthlyPrice: 999, isActive: false, featuredSlots: 1 }, after: { isActive: true } }));
  });

  it('refuses an unknown plan', async () => {
    planRepository.findById.mockResolvedValue(null);

    await expect(service.update('nope', {}, 'admin-1')).rejects.toThrow('Subscription plan');
  });
});
