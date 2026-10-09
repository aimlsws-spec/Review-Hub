import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AiCallLogService } from '../../../shared/ai-call-log';
import { LocalStorageService } from '../../../storage/storage.service';
import { FraudFlagRepository } from '../../admin/repositories';
import { DuplicateImageService } from '../../risk/services';
import { SubmissionService } from '../../task/services';
import { AiVerificationDecision } from '../dto';
import { AiVerificationJobRepository } from '../repositories';

import { AiVerificationService } from './ai-verification.service';

describe('AiVerificationService', () => {
  const mockAiCallLog = { record: jest.fn() };
  let service: AiVerificationService;
  let jobRepository: jest.Mocked<AiVerificationJobRepository>;
  let submissionService: jest.Mocked<SubmissionService>;
  let storageService: jest.Mocked<LocalStorageService>;

  const mockJobRepository = {
    findById: jest.fn(),
    findByIdWithSubmission: jest.fn(),
    claimNextQueued: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const mockSubmissionService = {
    aiReject: jest.fn(),
    deferToManualReview: jest.fn(),
  };

  const mockStorageService = {
    fileExists: jest.fn(),
    getFilePath: jest.fn(),
  };

  const mockFraudFlagRepository = {
    create: jest.fn(),
  };

  const mockDuplicateImageService = { check: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiVerificationService,
        { provide: AiVerificationJobRepository, useValue: mockJobRepository },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: LocalStorageService, useValue: mockStorageService },
        { provide: FraudFlagRepository, useValue: mockFraudFlagRepository },
        { provide: DuplicateImageService, useValue: mockDuplicateImageService },
        { provide: AiCallLogService, useValue: mockAiCallLog },
      ],
    }).compile();

    // Nothing is flagged unless a test says so.
    mockDuplicateImageService.check.mockResolvedValue(null);

    service = module.get(AiVerificationService);
    jobRepository = module.get(AiVerificationJobRepository);
    submissionService = module.get(SubmissionService);
    storageService = module.get(LocalStorageService);
  });

  describe('claimNextJob', () => {
    it('delegates to the repository with the given engine and model', async () => {
      mockJobRepository.claimNextQueued.mockResolvedValue({ id: 'job-1' });

      const result = await service.claimNextJob('openai', 'gpt-4o-mini');

      expect(jobRepository.claimNextQueued).toHaveBeenCalledWith('openai', 'gpt-4o-mini');
      expect(result).toEqual({ id: 'job-1' });
    });
  });

  describe('completeJob', () => {
    const job = { id: 'job-1', submissionId: 'submission-1', submission: { userId: 'user-1' } };

    beforeEach(() => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue(job);
    });

    it('throws NotFoundException for an unknown job', async () => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue(null);

      await expect(
        service.completeJob('missing', { decision: AiVerificationDecision.APPROVE, confidence: 0.9 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('always records an audit log and marks the job completed', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.95,
        fraudScore: 0.1,
        explanation: 'Looks legit',
        processingTimeMs: 500,
      });

      expect(jobRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ confidence: 0.95, fraudScore: 0.1, decision: AiVerificationDecision.APPROVE }),
      );
      expect(jobRepository.markCompleted).toHaveBeenCalledWith('job-1', expect.objectContaining({ processingTimeMs: 500 }));
      expect(mockAiCallLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'SUBMISSION_VERIFICATION', status: 'SUCCESS', latencyMs: 500, confidence: 0.95, submissionId: 'submission-1' }),
      );
    });

    /** The submission waited for a person, and the system decided nothing itself. */
    function expectPersonDecides(result: { outcome: string }) {
      expect(submissionService.deferToManualReview).toHaveBeenCalledWith('submission-1');
      expect(submissionService.aiReject).not.toHaveBeenCalled();
      expect(result).toEqual({ submissionId: 'submission-1', outcome: 'PENDING_MANUAL' });
    }

    it.each([
      ['a confident approval', AiVerificationDecision.APPROVE, 0.99, 0],
      ['a confident rejection', AiVerificationDecision.REJECT, 0.99, 0],
      ['an unsure approval', AiVerificationDecision.APPROVE, 0.5, 0.1],
      ['an approval with a high fraud score', AiVerificationDecision.APPROVE, 0.99, 0.8],
      ['a request for review', AiVerificationDecision.MANUAL_REVIEW, 0.99, 0],
    ] as const)('hands %s to a person: the AI never pays or refuses on its own', async (_case, decision, confidence, fraudScore) => {
      expectPersonDecides(await service.completeJob('job-1', { decision, confidence, fraudScore }));
    });

    it.each(['AI', 'HYBRID', 'MANUAL'])('hands the submission to a person whatever the task was set to (%s)', async (verificationType) => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue({ ...job, submission: { userId: 'user-1', task: { verificationType } } });

      expectPersonDecides(await service.completeJob('job-1', { decision: AiVerificationDecision.APPROVE, confidence: 0.99, fraudScore: 0 }));
    });

    it('keeps the AI verdict for the reviewer to read', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.REJECT,
        confidence: 0.9,
        explanation: 'The screenshot shows a different cafe',
      });

      expect(jobRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ decision: AiVerificationDecision.REJECT, confidence: 0.9, explanation: 'The screenshot shows a different cafe' }),
      );
    });

    it('does not raise a fraud flag when the fraud score is at or below the threshold', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.9,
        fraudScore: 0.3,
      });

      expect(mockFraudFlagRepository.create).not.toHaveBeenCalled();
    });

    it('raises a MEDIUM fraud flag just above the threshold', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.9,
        fraudScore: 0.4,
      });

      expect(mockFraudFlagRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          submission: { connect: { id: 'submission-1' } },
          user: { connect: { id: 'user-1' } },
          riskLevel: 'MEDIUM',
        }),
      );
    });

    describe('duplicate images and other fraud flags', () => {
      const approve = { decision: AiVerificationDecision.APPROVE, confidence: 0.95, fraudScore: 0.05 };
      const fingerprint = { perceptualHash: '9f3a1c0e7b2d4a58', evidenceText: 'you are following viralkar official on instagram' };

      it('checks the picture against earlier ones when the worker sent a fingerprint', async () => {
        await service.completeJob('job-1', { ...approve, ...fingerprint });

        expect(mockDuplicateImageService.check).toHaveBeenCalledWith({
          submissionId: 'submission-1',
          userId: 'user-1',
          perceptualHash: '9f3a1c0e7b2d4a58',
          evidenceText: 'you are following viralkar official on instagram',
        });
      });

      it('does not check for duplicates when there is no fingerprint (text-only or video evidence)', async () => {
        await service.completeJob('job-1', approve);

        expect(mockDuplicateImageService.check).not.toHaveBeenCalled();
      });

      it('checks for duplicates before handing the submission to a person, so the flag it raises is there to see', async () => {
        const order: string[] = [];
        mockDuplicateImageService.check.mockImplementation(async () => void order.push('check'));
        mockSubmissionService.deferToManualReview.mockImplementation(async () => void order.push('to a person'));

        await service.completeJob('job-1', { ...approve, ...fingerprint });

        expect(order).toEqual(['check', 'to a person']);
      });

      it('still completes and records the job when the duplicate check fails', async () => {
        mockDuplicateImageService.check.mockRejectedValue(new Error('database unavailable'));

        await expect(service.completeJob('job-1', { ...approve, ...fingerprint })).resolves.toBeDefined();

        expect(jobRepository.markCompleted).toHaveBeenCalled();
      });
    });

    it('raises a HIGH fraud flag for a score of 0.6 or above', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.9,
        fraudScore: 0.65,
      });

      expect(mockFraudFlagRepository.create).toHaveBeenCalledWith(expect.objectContaining({ riskLevel: 'HIGH' }));
    });

    it('raises a CRITICAL fraud flag for a score of 0.8 or above', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.9,
        fraudScore: 0.85,
      });

      expect(mockFraudFlagRepository.create).toHaveBeenCalledWith(expect.objectContaining({ riskLevel: 'CRITICAL' }));
    });

    it('raises a fraud flag whatever the AI decided', async () => {
      await service.completeJob('job-1', {
        decision: AiVerificationDecision.REJECT,
        confidence: 0.9,
        fraudScore: 0.5,
        explanation: 'Duplicate screenshot',
      });

      expect(mockFraudFlagRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Duplicate screenshot' }),
      );
    });
  });

  describe('getEvidenceFilePath', () => {
    it('throws NotFoundException for an unknown job', async () => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue(null);

      await expect(service.getEvidenceFilePath('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the submission has no evidence file', async () => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue({
        id: 'job-1',
        submission: { fileUrl: null },
      });

      await expect(service.getEvidenceFilePath('job-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the file no longer exists on disk', async () => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue({
        id: 'job-1',
        submission: { fileUrl: 'submissions/proof.png' },
      });
      mockStorageService.fileExists.mockResolvedValue(false);

      await expect(service.getEvidenceFilePath('job-1')).rejects.toThrow(NotFoundException);
    });

    it('resolves the absolute path when the evidence file exists', async () => {
      mockJobRepository.findByIdWithSubmission.mockResolvedValue({
        id: 'job-1',
        submission: { fileUrl: 'submissions/proof.png' },
      });
      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFilePath.mockReturnValue('/uploads/submissions/proof.png');

      const result = await service.getEvidenceFilePath('job-1');

      expect(storageService.fileExists).toHaveBeenCalledWith('submissions/proof.png');
      expect(storageService.getFilePath).toHaveBeenCalledWith('submissions/proof.png');
      expect(result).toBe('/uploads/submissions/proof.png');
    });
  });

  describe('markFailed', () => {
    it('marks the job failed and defers the submission to manual review', async () => {
      mockJobRepository.findById.mockResolvedValue({ id: 'job-1', submissionId: 'submission-1' });

      const result = await service.markFailed('job-1', 'Model timed out');

      expect(jobRepository.markFailed).toHaveBeenCalledWith('job-1', 'Model timed out');
      expect(submissionService.deferToManualReview).toHaveBeenCalledWith('submission-1');
      expect(result).toEqual({ submissionId: 'submission-1', outcome: 'PENDING_MANUAL' });
    });

    it('throws NotFoundException for an unknown job', async () => {
      mockJobRepository.findById.mockResolvedValue(null);

      await expect(service.markFailed('missing', 'error')).rejects.toThrow(NotFoundException);
    });
  });
});
