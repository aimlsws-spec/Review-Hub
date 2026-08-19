import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { TaskSubmissionRepository } from './task-submission.repository';

describe('TaskSubmissionRepository', () => {
  let repository: TaskSubmissionRepository;

  const mockPrisma = {
    taskSubmission: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    submissionAttachment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    aIVerificationJob: {
      create: jest.fn(),
    },
    submissionFraudFlag: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskSubmissionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<TaskSubmissionRepository>(TaskSubmissionRepository);
    jest.clearAllMocks();
  });

  describe('findLatestAttempt', () => {
    it('should order by attemptNumber descending', async () => {
      mockPrisma.taskSubmission.findFirst.mockResolvedValue({ id: 'submission-1', attemptNumber: 2 });

      const result = await repository.findLatestAttempt('participant-1', 'task-1');
      expect(result).toHaveProperty('attemptNumber', 2);
      expect(mockPrisma.taskSubmission.findFirst).toHaveBeenCalledWith({
        where: { participantId: 'participant-1', taskId: 'task-1' },
        orderBy: { attemptNumber: 'desc' },
      });
    });
  });

  describe('findByUser', () => {
    it('should return paginated submissions for a user', async () => {
      mockPrisma.taskSubmission.findMany.mockResolvedValue([{ id: 'submission-1' }]);
      mockPrisma.taskSubmission.count.mockResolvedValue(1);

      const result = await repository.findByUser({ userId: 'user-1', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.taskSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', deletedAt: null } }),
      );
    });
  });

  describe('createVerificationJob', () => {
    it('should call the aIVerificationJob delegate', async () => {
      mockPrisma.aIVerificationJob.create.mockResolvedValue({ id: 'job-1', status: 'QUEUED' });

      const result = await repository.createVerificationJob({} as never);
      expect(result).toHaveProperty('status', 'QUEUED');
    });
  });

  describe('findAttachmentByChecksum', () => {
    it('should look up by checksum and include the submission', async () => {
      mockPrisma.submissionAttachment.findFirst.mockResolvedValue({ id: 'attachment-1', checksum: 'abc' });

      const result = await repository.findAttachmentByChecksum('abc');
      expect(result).toHaveProperty('checksum', 'abc');
      expect(mockPrisma.submissionAttachment.findFirst).toHaveBeenCalledWith({
        where: { checksum: 'abc' },
        include: { submission: true },
      });
    });
  });
});
