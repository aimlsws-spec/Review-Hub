import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    guard = new JwtAuthGuard(mockReflector as unknown as Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as import('@nestjs/common').ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});
