import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IdentityVerificationRequiredException } from '../exceptions';
import { UserKycService } from '../services';

import { IdentityVerificationGuard } from './identity-verification.guard';

describe('IdentityVerificationGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const userKycService = { hasIdentityDocument: jest.fn() };
  const guard = new IdentityVerificationGuard(reflector as unknown as Reflector, userKycService as unknown as UserKycService);

  function contextFor(user?: { id: string }): ExecutionContext {
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it('lets every unmarked route through without looking anything up', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(contextFor({ id: 'user-1' }))).resolves.toBe(true);
    expect(userKycService.hasIdentityDocument).not.toHaveBeenCalled();
  });

  it('lets a person with PAN or an identity document use a marked route', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    userKycService.hasIdentityDocument.mockResolvedValue(true);

    await expect(guard.canActivate(contextFor({ id: 'user-1' }))).resolves.toBe(true);
    expect(userKycService.hasIdentityDocument).toHaveBeenCalledWith('user-1');
  });

  it('refuses a marked route, asking for identity verification, when nothing has been uploaded', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    userKycService.hasIdentityDocument.mockResolvedValue(false);

    await expect(guard.canActivate(contextFor({ id: 'user-1' }))).rejects.toBeInstanceOf(IdentityVerificationRequiredException);
  });
});
