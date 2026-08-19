import { Reflector } from '@nestjs/core';

import { ForbiddenException } from '@common/exceptions/domain.exceptions';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    guard = new RolesGuard(mockReflector as unknown as Reflector);
    jest.clearAllMocks();
  });

  const mockContext = (userRoles?: string[]) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1', roles: userRoles },
      }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  }) as unknown as import('@nestjs/common').ExecutionContext;

  it('should allow access when no roles are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext(['USER']));

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['USER']);

    const result = await guard.canActivate(mockContext(['USER']));

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    await expect(guard.canActivate(mockContext(['USER']))).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no roles', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['USER']);

    await expect(guard.canActivate(mockContext())).rejects.toThrow(ForbiddenException);
  });
});
