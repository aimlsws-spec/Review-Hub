import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AdminRole, SystemRole } from '@common/enums';

import { ROLES_KEY } from '../../auth/decorators';
import { MERCHANT_TEAM_ROLES_KEY } from '../../merchant/constants';
import { MerchantTeamRoleGuard } from '../../merchant/guards';
import { MerchantSubscriptionService, SubscriptionPlanAdminService } from '../services';

import { AdminSubscriptionPlanController } from './admin-subscription-plan.controller';
import { MerchantSubscriptionController } from './merchant-subscription.controller';

describe('subscription controllers', () => {
  it('lets any admin read plans but only finance and super admins change them', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminSubscriptionPlanController)).toEqual([SystemRole.Admin]);
    for (const method of ['create', 'update'] as const) {
      expect(Reflect.getMetadata(ROLES_KEY, AdminSubscriptionPlanController.prototype[method])).toEqual([AdminRole.FinanceTeam, AdminRole.SuperAdmin]);
    }
  });

  it('lets only team owners and admins pay for a plan or a feature', () => {
    for (const method of ['subscribe', 'cancel', 'resume', 'feature'] as const) {
      const handler = MerchantSubscriptionController.prototype[method];
      expect(Reflect.getMetadata(MERCHANT_TEAM_ROLES_KEY, handler)).toEqual(['OWNER', 'ADMIN']);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(MerchantTeamRoleGuard);
    }
  });

  it('passes requests through to the services', async () => {
    const planService = { list: jest.fn(), create: jest.fn(), update: jest.fn() };
    const subscriptionService = { getOverview: jest.fn(), subscribe: jest.fn(), cancel: jest.fn(), resume: jest.fn(), featureCampaign: jest.fn() };
    const admin = new AdminSubscriptionPlanController(planService as unknown as SubscriptionPlanAdminService);
    const merchant = new MerchantSubscriptionController(subscriptionService as unknown as MerchantSubscriptionService);

    await admin.update('p-1', { isActive: true }, 'admin-1');
    await merchant.subscribe('m-1', { planId: 'p-1' });
    await merchant.feature('m-1', 'c-1');

    expect(planService.update).toHaveBeenCalledWith('p-1', { isActive: true }, 'admin-1');
    expect(subscriptionService.subscribe).toHaveBeenCalledWith('m-1', 'p-1');
    expect(subscriptionService.featureCampaign).toHaveBeenCalledWith('m-1', 'c-1');
  });
});
