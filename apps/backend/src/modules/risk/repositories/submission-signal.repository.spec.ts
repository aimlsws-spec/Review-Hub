import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SubmissionSignalRepository } from './submission-signal.repository';

describe('SubmissionSignalRepository', () => {
  let repository: SubmissionSignalRepository;

  const mockPrisma = { submissionFraudFlag: { create: jest.fn(), count: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubmissionSignalRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<SubmissionSignalRepository>(SubmissionSignalRepository);
    jest.clearAllMocks();
  });

  it('creates a flag tied to the submission and user, with its type and evidence', async () => {
    await repository.createFlag({
      submissionId: 'sub-1',
      userId: 'user-1',
      type: 'DUPLICATE_SUBMISSION',
      riskLevel: 'HIGH',
      reason: 'Same picture as another user',
      metadata: { kind: 'perceptual', matchedSubmissionId: 'sub-2' },
    });

    expect(mockPrisma.submissionFraudFlag.create).toHaveBeenCalledWith({
      data: {
        submission: { connect: { id: 'sub-1' } },
        user: { connect: { id: 'user-1' } },
        type: 'DUPLICATE_SUBMISSION',
        riskLevel: 'HIGH',
        reason: 'Same picture as another user',
        metadata: { kind: 'perceptual', matchedSubmissionId: 'sub-2' },
      },
    });
  });

  describe('hasFlagAbout', () => {
    it('asks whether this submission already has a flag of this type pointing at the same other submission', async () => {
      mockPrisma.submissionFraudFlag.count.mockResolvedValue(1);

      await expect(repository.hasFlagAbout('sub-1', 'DUPLICATE_SUBMISSION', 'sub-2')).resolves.toBe(true);

      expect(mockPrisma.submissionFraudFlag.count).toHaveBeenCalledWith({
        where: { submissionId: 'sub-1', type: 'DUPLICATE_SUBMISSION', metadata: { path: '$.matchedSubmissionId', equals: 'sub-2' } },
      });
    });

    it('is false when there is none', async () => {
      mockPrisma.submissionFraudFlag.count.mockResolvedValue(0);

      await expect(repository.hasFlagAbout('sub-1', 'DUPLICATE_SUBMISSION', 'sub-2')).resolves.toBe(false);
    });
  });

  describe('hasUnresolvedBlockingFlag', () => {
    it('counts only open flags at HIGH or CRITICAL', async () => {
      mockPrisma.submissionFraudFlag.count.mockResolvedValue(2);

      await expect(repository.hasUnresolvedBlockingFlag('sub-1')).resolves.toBe(true);

      expect(mockPrisma.submissionFraudFlag.count).toHaveBeenCalledWith({
        where: { submissionId: 'sub-1', resolved: false, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
      });
    });

    it('is false when nothing serious is open', async () => {
      mockPrisma.submissionFraudFlag.count.mockResolvedValue(0);

      await expect(repository.hasUnresolvedBlockingFlag('sub-1')).resolves.toBe(false);
    });
  });
});
