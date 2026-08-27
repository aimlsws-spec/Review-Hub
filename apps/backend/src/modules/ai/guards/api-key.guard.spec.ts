import { ExecutionContext } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UnauthorizedException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { ApiKeyGuard } from './api-key.guard';

jest.mock('bcrypt');

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  const mockPrisma = {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ApiKeyGuard(mockPrisma as unknown as PrismaService);
  });

  function contextWithHeaders(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  }

  it('rejects a request with no API credentials', async () => {
    await expect(guard.canActivate(contextWithHeaders({}))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown key', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'bad-key', 'x-api-secret': 'secret' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive key', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      key: 'ai-service',
      secret: 'hashed',
      active: false,
      deletedAt: null,
      expiresAt: null,
    });

    await expect(
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'ai-service', 'x-api-secret': 'secret' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired key', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      key: 'ai-service',
      secret: 'hashed',
      active: true,
      deletedAt: null,
      expiresAt: new Date('2020-01-01'),
    });

    await expect(
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'ai-service', 'x-api-secret': 'secret' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong secret', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      key: 'ai-service',
      secret: 'hashed',
      active: true,
      deletedAt: null,
      expiresAt: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      guard.canActivate(contextWithHeaders({ 'x-api-key': 'ai-service', 'x-api-secret': 'wrong' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('allows a valid key/secret pair and touches lastUsedAt', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      key: 'ai-service',
      secret: 'hashed',
      active: true,
      deletedAt: null,
      expiresAt: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await guard.canActivate(contextWithHeaders({ 'x-api-key': 'ai-service', 'x-api-secret': 'correct' }));

    expect(result).toBe(true);
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
