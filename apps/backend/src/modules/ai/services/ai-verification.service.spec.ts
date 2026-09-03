import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { FraudFlagRepository } from '../../admin/repositories';
import { SubmissionService } from '../../task/services';
import { AiVerificationDecision } from '../dto';
import { AiVerificationJobRepository } from '../repositories';

import { AiVerificationService } from './ai-verification.service';

describe('AiVerificationService', () => {
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
    aiApprove: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiVerificationService,
        { provide: AiVerificationJobRepository, useValue: mockJobRepository },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: LocalStorageService, useValue: mockStorageService },
        { provide: FraudFlagRepository, useValue: mockFraudFlagRepository },
      ],
    }).compile();

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
    });

    it('auto-approves when confidence and fraud score both clear the threshold', async () => {
      const result = await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.9,
        fraudScore: 0.1,
      });

      expect(submissionService.aiApprove).toHaveBeenCalledWith('submission-1');
      expect(submissionService.deferToManualReview).not.toHaveBeenCalled();
      expect(result).toEqual({ submissionId: 'submission-1', outcome: 'APPROVED' });
    });

    it('auto-rejects when confidence clears the threshold and the model says reject', async () => {
      const result = await service.completeJob('job-1', {
        decision: AiVerificationDecision.REJECT,
        confidence: 0.9,
        fraudScore: 0.1,
        explanation: 'Screenshot does not match the task',
      });

      expect(submissionService.aiReject).toHaveBeenCalledWith('submission-1', 'Screenshot does not match the task');
      expect(result).toEqual({ submissionId: 'submission-1', outcome: 'REJECTED' });
    });

    it('defers to manual review when confidence is below the threshold, even for an APPROVE decision', async () => {
      const result = await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.5,
        fraudScore: 0.1,
      });

      expect(submissionService.aiApprove).not.toHaveBeenCalled();
      expect(submissionService.deferToManualReview).toHaveBeenCalledWith('submission-1');
      expect(result).toEqual({ submissionId: 'submission-1', outcome: 'PENDING_MANUAL' });
    });

    it('defers to manual review when fraud score exceeds the threshold, even with high confidence', async () => {
      const result = await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.99,
        fraudScore: 0.8,
      });

      expect(submissionService.aiApprove).not.toHaveBeenCalled();
      expect(submissionService.deferToManualReview).toHaveBeenCalledWith('submission-1');
      expect(result.outcome).toBe('PENDING_MANUAL');
    });

    it('defers to manual review whenever the model itself asks for it, regardless of confidence', async () => {
      const result = await service.completeJob('job-1', {
        decision: AiVerificationDecision.MANUAL_REVIEW,
        confidence: 0.99,
        fraudScore: 0,
      });

      expect(submissionService.aiApprove).not.toHaveBeenCalled();
      expect(submissionService.aiReject).not.toHaveBeenCalled();
      expect(submissionService.deferToManualReview).toHaveBeenCalledWith('submission-1');
      expect(result.outcome).toBe('PENDING_MANUAL');
    });

    it('treats a missing fraudScore as zero rather than failing the threshold check', async () => {
      const result = await service.completeJob('job-1', {
        decision: AiVerificationDecision.APPROVE,
        confidence: 0.9,
      });

      expect(submissionService.aiApprove).toHaveBeenCalledWith('submission-1');
      expect(result.outcome).toBe('APPROVED');
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

    it('still raises a fraud flag even when the submission is auto-rejected, not just approved', async () => {
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
