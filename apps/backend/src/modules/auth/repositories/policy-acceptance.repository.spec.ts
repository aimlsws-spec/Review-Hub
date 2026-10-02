import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { PolicyAcceptanceRepository } from './policy-acceptance.repository';

describe('PolicyAcceptanceRepository', () => {
  let repository: PolicyAcceptanceRepository;

  const mockPrisma = {
    policyAcceptance: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const documents = [
    { policy: 'TERMS_OF_SERVICE' as const, version: '2026-10-01' },
    { policy: 'PRIVACY_POLICY' as const, version: '2026-10-01' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyAcceptanceRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<PolicyAcceptanceRepository>(PolicyAcceptanceRepository);
    jest.clearAllMocks();
  });

  it('looks up acceptances of exactly the given versions', async () => {
    mockPrisma.policyAcceptance.findMany.mockResolvedValue([]);

    await repository.findAccepted('user-1', documents);

    expect(mockPrisma.policyAcceptance.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', OR: documents },
      select: { policy: true, version: true, acceptedAt: true },
    });
  });

  it('records each document, skipping versions already accepted, and trims oversized request details', async () => {
    mockPrisma.policyAcceptance.createMany.mockResolvedValue({ count: 2 });
    const longAgent = 'x'.repeat(600);

    await repository.createMany('user-1', documents, '10.0.0.1', longAgent);

    expect(mockPrisma.policyAcceptance.createMany).toHaveBeenCalledWith({
      data: documents.map((d) => ({ userId: 'user-1', ...d, ipAddress: '10.0.0.1', userAgent: 'x'.repeat(512) })),
      skipDuplicates: true,
    });
  });

  it('writes nothing for an empty list', async () => {
    await expect(repository.createMany('user-1', [])).resolves.toEqual({ count: 0 });
    expect(mockPrisma.policyAcceptance.createMany).not.toHaveBeenCalled();
  });
});
