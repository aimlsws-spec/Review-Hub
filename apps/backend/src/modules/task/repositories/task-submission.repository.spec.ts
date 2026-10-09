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
      updateMany: jest.fn(),
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
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  // The transaction client is the same mock, so what the callback does can be checked directly.
  const runInTransaction = (callback: (tx: unknown) => unknown): unknown => callback(mockPrisma);

  const input = {
    participantId: 'participant-1',
    taskId: 'task-1',
    userId: 'user-1',
    maxCompletions: 2,
    period: { start: new Date('2026-10-04T18:30:00Z'), end: new Date('2026-10-11T18:30:00Z') },
    data: { status: 'PENDING' } as never,
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
    mockPrisma.$transaction.mockImplementation(runInTransaction);
  });

  describe('updateIfStatusIn', () => {
    it('writes only while the submission is still in one of the given statuses, and says it did', async () => {
      mockPrisma.taskSubmission.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.updateIfStatusIn('s-1', ['PENDING', 'PENDING_MANUAL'], { status: 'APPROVED' })).resolves.toBe(true);

      expect(mockPrisma.taskSubmission.updateMany).toHaveBeenCalledWith({
        where: { id: 's-1', deletedAt: null, status: { in: ['PENDING', 'PENDING_MANUAL'] } },
        data: { status: 'APPROVED' },
      });
    });

    it('says it did not when the submission had already moved on, so the caller can stop', async () => {
      mockPrisma.taskSubmission.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.updateIfStatusIn('s-1', ['PENDING'], { status: 'REJECTED' })).resolves.toBe(false);
    });
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

  describe('createWithinLimit', () => {
    it('locks the participant first, then creates while the limit allows', async () => {
      mockPrisma.taskSubmission.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      mockPrisma.taskSubmission.create.mockResolvedValue({ id: 'submission-1' });

      await expect(repository.createWithinLimit(input)).resolves.toEqual({ outcome: 'created', submission: { id: 'submission-1' } });

      expect(mockPrisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockPrisma.taskSubmission.count.mock.invocationCallOrder[0]);
      expect(mockPrisma.taskSubmission.count).toHaveBeenLastCalledWith({
        where: {
          taskId: 'task-1',
          userId: 'user-1',
          deletedAt: null,
          status: { in: ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL', 'APPROVED'] },
          createdAt: { gte: input.period.start, lt: input.period.end },
        },
      });
    });

    it('creates nothing once the limit is used up', async () => {
      mockPrisma.taskSubmission.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

      await expect(repository.createWithinLimit(input)).resolves.toEqual({ outcome: 'limit-reached' });
      expect(mockPrisma.taskSubmission.create).not.toHaveBeenCalled();
    });

    it('creates nothing while another submission is still being checked', async () => {
      mockPrisma.taskSubmission.count.mockResolvedValueOnce(1);

      await expect(repository.createWithinLimit(input)).resolves.toEqual({ outcome: 'in-flight' });
      expect(mockPrisma.taskSubmission.create).not.toHaveBeenCalled();
    });

    it('counts over the whole life of a once-only task', async () => {
      mockPrisma.taskSubmission.count.mockResolvedValue(0);
      mockPrisma.taskSubmission.create.mockResolvedValue({ id: 'submission-1' });

      await repository.createWithinLimit({ ...input, period: null });

      expect(mockPrisma.taskSubmission.count.mock.calls[1][0].where).not.toHaveProperty('createdAt');
    });
  });

  describe('findOwnForTasks', () => {
    it("reads one person's counting submissions for the given tasks", async () => {
      mockPrisma.taskSubmission.findMany.mockResolvedValue([]);

      await repository.findOwnForTasks('user-1', ['task-1', 'task-2']);

      expect(mockPrisma.taskSubmission.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          taskId: { in: ['task-1', 'task-2'] },
          deletedAt: null,
          status: { in: ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL', 'APPROVED'] },
        },
        select: { taskId: true, status: true, createdAt: true },
      });
    });

    it('asks nothing for an empty list', async () => {
      expect(await repository.findOwnForTasks('user-1', [])).toEqual([]);
      expect(mockPrisma.taskSubmission.findMany).not.toHaveBeenCalled();
    });
  });
});
