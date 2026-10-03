import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { MERCHANT_TEAM_PERMISSIONS } from '../constants';

import { MerchantTeamRoleGuard } from './merchant-role.guard';

describe('MerchantTeamRoleGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new MerchantTeamRoleGuard(reflector as unknown as Reflector);

  const contextFor = (merchantTeamRole?: string) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ merchantTeamRole }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('allows any member when the route names no roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor('VIEWER'))).toBe(true);
  });

  it.each([
    ['OWNER', true],
    ['ADMIN', true],
    ['MANAGER', false],
    ['ANALYST', false],
    ['VIEWER', false],
  ])('account management: %s -> %s', (role, allowed) => {
    reflector.getAllAndOverride.mockReturnValue([...MERCHANT_TEAM_PERMISSIONS.MANAGE_ACCOUNT]);
    expect(guard.canActivate(contextFor(role))).toBe(allowed);
  });

  it.each([
    ['MANAGER', true],
    ['ANALYST', false],
    ['VIEWER', false],
  ])('campaign work: %s -> %s', (role, allowed) => {
    reflector.getAllAndOverride.mockReturnValue([...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS]);
    expect(guard.canActivate(contextFor(role))).toBe(allowed);
  });

  it('refuses when no ownership guard resolved a role', () => {
    reflector.getAllAndOverride.mockReturnValue([...MERCHANT_TEAM_PERMISSIONS.MANAGE_CAMPAIGNS]);
    expect(guard.canActivate(contextFor(undefined))).toBe(false);
  });
});
