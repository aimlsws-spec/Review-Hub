import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { MerchantController } from '../controllers/merchant.controller';
import { MerchantRepository, MerchantTeamRepository } from '../repositories';

import { MerchantOwnershipGuard } from './merchant-ownership.guard';
import { MerchantTeamRoleGuard } from './merchant-role.guard';

describe('MerchantOwnershipGuard', () => {
  const merchantRepository = { findById: jest.fn() };
  const teamRepository = { findByMerchantAndUser: jest.fn() };
  const guard = new MerchantOwnershipGuard(
    merchantRepository as unknown as MerchantRepository,
    teamRepository as unknown as MerchantTeamRepository,
  );

  const contextFor = (request: Record<string, unknown>) =>
    ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    merchantRepository.findById.mockResolvedValue({ id: 'merchant-1', userId: 'user-owner' });
  });

  it('lets the owner in as OWNER without needing a team row', async () => {
    const request = { user: { id: 'user-owner' }, params: { merchantId: 'merchant-1' } } as Record<string, unknown>;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.merchantTeamRole).toBe('OWNER');
    expect(teamRepository.findByMerchantAndUser).not.toHaveBeenCalled();
  });

  it('lets an active team member in with their role', async () => {
    teamRepository.findByMerchantAndUser.mockResolvedValue({ role: 'VIEWER', status: 'ACTIVE' });
    const request = { user: { id: 'user-2' }, params: { merchantId: 'merchant-1' } } as Record<string, unknown>;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.merchantTeamRole).toBe('VIEWER');
  });

  it('refuses a suspended team member', async () => {
    teamRepository.findByMerchantAndUser.mockResolvedValue({ role: 'ADMIN', status: 'SUSPENDED' });
    const request = { user: { id: 'user-2' }, params: { merchantId: 'merchant-1' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(false);
  });

  it('refuses someone outside the team', async () => {
    teamRepository.findByMerchantAndUser.mockResolvedValue(null);
    const request = { user: { id: 'stranger' }, params: { merchantId: 'merchant-1' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(false);
  });
});

describe('MerchantController guard order', () => {
  it('resolves the team role before checking it on a write route', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, MerchantController.prototype.addBankAccount) as unknown[];

    expect(guards.indexOf(MerchantOwnershipGuard)).toBeGreaterThanOrEqual(0);
    expect(guards.indexOf(MerchantOwnershipGuard)).toBeLessThan(guards.indexOf(MerchantTeamRoleGuard));
  });
});
