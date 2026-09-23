import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { QUEUE_NAMES } from '../../../queues/queue.constants';
import { LocalStorageService } from '../../../storage/storage.service';
import { AiAssistService } from '../../ai/services/ai-assist.service';
import { CampaignRepository } from '../../campaign/repositories';
import { MerchantRepository } from '../../merchant/repositories';
import { SubmissionRiskService } from '../../risk/services';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';

import { LocationCheckinVerificationService } from './location-checkin-verification.service';
import { QrScanVerificationService } from './qr-scan-verification.service';
import { SubmissionService } from './submission.service';
import { TaskParticipationService } from './task-participation.service';

describe('TaskParticipationService', () => {
  let service: TaskParticipationService;

  const mockCampaignTaskRepository = {
    findById: jest.fn(),
    countActiveByCampaignId: jest.fn(),
  };
  const mockCampaignRepository = { findById: jest.fn() };
  const mockParticipantRepository = { findByCampaignAndUser: jest.fn(), create: jest.fn(), update: jest.fn() };
  const mockSubmissionRepository = {
    findLatestAttempt: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    createAttachment: jest.fn(),
    findAttachmentByChecksum: jest.fn(),
    createVerificationJob: jest.fn(),
    createFraudFlag: jest.fn(),
  };
  const mockStorageService = { saveFile: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAiAssistService = { suggestText: jest.fn(), draftReviews: jest.fn(), generateCaptions: jest.fn() };
  const mockMerchantRepository = { findById: jest.fn() };

  const activeCampaign = {
    id: 'campaign-1',
    status: 'ACTIVE',
    title: 'Summer Launch',
    description: 'A great new product.',
    merchantId: 'merchant-1',
  };
  const task = {
    id: 'task-1',
    campaignId: 'campaign-1',
    proofRequired: true,
    taskType: 'TEXT',
    title: 'Write a short review',
    instructions: 'Keep it honest',
  };
  const participant = { id: 'participant-1', campaignId: 'campaign-1', userId: 'user-1', status: 'IN_PROGRESS' };

  const mockSubmissionRisk = { assess: jest.fn() };
  const mockAiQueue = { add: jest.fn() };
  const mockSubmissionService = { aiApprove: jest.fn(), aiReject: jest.fn() };
  const mockQrScanVerification = { verify: jest.fn() };
  const mockLocationCheckinVerification = { verify: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskParticipationService,
        { provide: CampaignTaskRepository, useValue: mockCampaignTaskRepository },
        { provide: CampaignRepository, useValue: mockCampaignRepository },
        { provide: CampaignParticipantRepository, useValue: mockParticipantRepository },
        { provide: TaskSubmissionRepository, useValue: mockSubmissionRepository },
        { provide: LocalStorageService, useValue: mockStorageService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AiAssistService, useValue: mockAiAssistService },
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: SubmissionRiskService, useValue: mockSubmissionRisk },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: QrScanVerificationService, useValue: mockQrScanVerification },
        { provide: LocationCheckinVerificationService, useValue: mockLocationCheckinVerification },
        { provide: getQueueToken(QUEUE_NAMES.AI_VERIFICATION), useValue: mockAiQueue },
      ],
    }).compile();

    service = module.get<TaskParticipationService>(TaskParticipationService);
    jest.clearAllMocks();
    mockSubmissionRisk.assess.mockResolvedValue(undefined);
  });

  describe('startTask', () => {
    it('should create a new participant on first start', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockParticipantRepository.findByCampaignAndUser.mockResolvedValue(null);
      mockCampaignTaskRepository.countActiveByCampaignId.mockResolvedValue(3);
      mockParticipantRepository.create.mockResolvedValue(participant);

      const result = await service.startTask('task-1', 'user-1');
      expect(result.participant).toEqual(participant);
      expect(mockParticipantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PROGRESS', tasksTotal: 3 }),
      );
    });

    it('should reject starting on an inactive campaign', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue({ ...activeCampaign, status: 'PAUSED' });

      await expect(service.startTask('task-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject an unknown task', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(null);

      await expect(service.startTask('unknown', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject continuing a disqualified participation', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockParticipantRepository.findByCampaignAndUser.mockResolvedValue({ ...participant, status: 'DISQUALIFIED' });

      await expect(service.startTask('task-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('suggestText', () => {
    beforeEach(() => {
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
    });

    it('delegates to AiAssistService with the task/campaign context for a supported task type', async () => {
      mockAiAssistService.suggestText.mockResolvedValue({ suggestion: 'Loved it!', source: 'template' });

      const result = await service.suggestText('task-1');

      expect(mockAiAssistService.suggestText).toHaveBeenCalledWith({
        taskType: 'TEXT',
        campaignTitle: 'Summer Launch',
        campaignDescription: 'A great new product.',
        taskTitle: 'Write a short review',
        taskInstructions: 'Keep it honest',
      });
      expect(result).toEqual({ suggestion: 'Loved it!', source: 'template' });
    });

    it('rejects a task type that a text suggestion makes no sense for', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue({ ...task, taskType: 'APP_INSTALL' });

      await expect(service.suggestText('task-1')).rejects.toThrow(BadRequestException);
      expect(mockAiAssistService.suggestText).not.toHaveBeenCalled();
    });

    it('rejects an unknown task', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(null);

      await expect(service.suggestText('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('draftReviews', () => {
    const reviewTask = { ...task, taskType: 'GOOGLE_REVIEW' };
    const merchant = { id: 'merchant-1', businessName: 'Cafe Aroma' };

    beforeEach(() => {
      mockCampaignTaskRepository.findById.mockResolvedValue(reviewTask);
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockMerchantRepository.findById.mockResolvedValue(merchant);
    });

    it('resolves the merchant business name (not the campaign title) and delegates to AiAssistService', async () => {
      mockAiAssistService.draftReviews.mockResolvedValue({ drafts: ['Great food!'], source: 'llm' });

      const result = await service.draftReviews('task-1', { likedAspects: ['FOOD'], notes: 'Loved it' });

      expect(mockMerchantRepository.findById).toHaveBeenCalledWith('merchant-1');
      expect(mockAiAssistService.draftReviews).toHaveBeenCalledWith({
        businessName: 'Cafe Aroma',
        likedAspects: ['FOOD'],
        notes: 'Loved it',
      });
      expect(result).toEqual({ drafts: ['Great food!'], source: 'llm' });
    });

    it('passes on everything the person said about their visit, and nothing they did not', async () => {
      mockAiAssistService.draftReviews.mockResolvedValue({ drafts: ['Mixed.'], source: 'template' });

      await service.draftReviews('task-1', {
        likedAspects: ['FOOD'],
        improveAspects: ['SERVICE'],
        experience: 'MIXED',
        wouldRecommend: false,
        notes: 'Slow.',
      });

      expect(mockAiAssistService.draftReviews).toHaveBeenCalledWith({
        businessName: 'Cafe Aroma',
        likedAspects: ['FOOD'],
        improveAspects: ['SERVICE'],
        experience: 'MIXED',
        wouldRecommend: false,
        notes: 'Slow.',
      });

      await service.draftReviews('task-1', {});
      const sent = mockAiAssistService.draftReviews.mock.calls[1][0];
      expect(sent.wouldRecommend).toBeUndefined();
      expect(sent.experience).toBeUndefined();
    });

    it('rejects a task type review drafts make no sense for', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue({ ...task, taskType: 'INSTAGRAM_COMMENT' });

      await expect(service.draftReviews('task-1', {})).rejects.toThrow(BadRequestException);
      expect(mockAiAssistService.draftReviews).not.toHaveBeenCalled();
    });

    it('throws if the merchant cannot be resolved', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.draftReviews('task-1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCaptions', () => {
    beforeEach(() => {
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
    });

    it('delegates to AiAssistService with the campaign context, for any task type', async () => {
      mockAiAssistService.generateCaptions.mockResolvedValue({
        captions: [{ style: 'short', caption: 'Summer Launch!' }],
        hashtags: ['#SummerLaunch'],
        source: 'llm',
      });

      const result = await service.generateCaptions('task-1');

      expect(mockAiAssistService.generateCaptions).toHaveBeenCalledWith({
        campaignTitle: 'Summer Launch',
        campaignDescription: 'A great new product.',
      });
      expect(result.source).toBe('llm');
    });
  });

  describe('submitTask', () => {
    beforeEach(() => {
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockParticipantRepository.findByCampaignAndUser.mockResolvedValue(participant);
      mockSubmissionRepository.findLatestAttempt.mockResolvedValue(null);
      mockSubmissionRepository.create.mockResolvedValue({ id: 'submission-1' });
      mockSubmissionRepository.findById.mockResolvedValue({ id: 'submission-1', status: 'PENDING_MANUAL' });
      mockSubmissionRepository.createVerificationJob.mockResolvedValue({ id: 'job-1' });
    });

    it('should reject submitting without starting first', async () => {
      mockParticipantRepository.findByCampaignAndUser.mockResolvedValue(null);

      await expect(service.submitTask('task-1', 'user-1', { textAnswer: 'done' })).rejects.toThrow(BadRequestException);
    });

    it('should reject a task requiring proof with no evidence at all', async () => {
      await expect(service.submitTask('task-1', 'user-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should accept a text-only submission and queue an AI verification job', async () => {
      const result = await service.submitTask('task-1', 'user-1', { textAnswer: 'Great service!' });

      expect(result).toHaveProperty('id', 'submission-1');
      expect(mockSubmissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', attemptNumber: 1 }),
      );
      expect(mockSubmissionRepository.createVerificationJob).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'QUEUED' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.submitted', expect.any(Object));
    });

    it('should reject resubmitting while a prior attempt is still pending', async () => {
      mockSubmissionRepository.findLatestAttempt.mockResolvedValue({ attemptNumber: 1, status: 'PENDING_MANUAL' });

      await expect(service.submitTask('task-1', 'user-1', { textAnswer: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('should allow resubmitting after a rejection, incrementing attemptNumber', async () => {
      mockSubmissionRepository.findLatestAttempt.mockResolvedValue({ attemptNumber: 1, status: 'REJECTED' });

      await service.submitTask('task-1', 'user-1', { textAnswer: 'retry' });
      expect(mockSubmissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ attemptNumber: 2 }),
      );
    });

    it('should upload a file and flag a checksum match from a different user as HIGH risk', async () => {
      const file = { originalname: 'proof.jpg', mimetype: 'image/jpeg', size: 1024, buffer: Buffer.from('abc') } as Express.Multer.File;
      mockStorageService.saveFile.mockResolvedValue({ path: '/submissions/campaign-1/task-1/file.jpg' });
      mockSubmissionRepository.findAttachmentByChecksum.mockResolvedValue({
        submissionId: 'earlier-submission',
        submission: { userId: 'someone-else' },
      });

      await service.submitTask('task-1', 'user-1', {}, file);

      expect(mockStorageService.saveFile).toHaveBeenCalled();
      expect(mockSubmissionRepository.createAttachment).toHaveBeenCalled();
      expect(mockSubmissionRepository.createFraudFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'HIGH',
          type: 'DUPLICATE_SUBMISSION',
          // Naming the match lets the picture-similarity check see this pair is already flagged, and lets a reviewer find it.
          metadata: { kind: 'exact', matchedSubmissionId: 'earlier-submission', matchedUserId: 'someone-else' },
        }),
      );
    });

    it('should flag a checksum match with the same user as a LOW-risk note of the same type', async () => {
      const file = { originalname: 'proof.jpg', mimetype: 'image/jpeg', size: 1024, buffer: Buffer.from('abc') } as Express.Multer.File;
      mockStorageService.saveFile.mockResolvedValue({ path: '/submissions/campaign-1/task-1/file.jpg' });
      mockSubmissionRepository.findAttachmentByChecksum.mockResolvedValue({
        submissionId: 'my-earlier-submission',
        submission: { userId: 'user-1' },
      });

      await service.submitTask('task-1', 'user-1', {}, file);

      expect(mockSubmissionRepository.createFraudFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: 'LOW',
          type: 'DUPLICATE_SUBMISSION',
          metadata: { kind: 'exact', matchedSubmissionId: 'my-earlier-submission', matchedUserId: 'user-1' },
        }),
      );
    });

    describe('checking where the submission came from', () => {
      it('runs the risk check with the submission, user, campaign and the requester IP', async () => {
        await service.submitTask('task-1', 'user-1', { textAnswer: 'Great service!' }, undefined, { ip: '203.0.113.9' });

        expect(mockSubmissionRisk.assess).toHaveBeenCalledWith({
          submissionId: 'submission-1',
          userId: 'user-1',
          campaignId: 'campaign-1',
          ip: '203.0.113.9',
        });
      });

      it('still runs it when no IP is known', async () => {
        await service.submitTask('task-1', 'user-1', { textAnswer: 'Great service!' });

        expect(mockSubmissionRisk.assess).toHaveBeenCalledWith(expect.objectContaining({ submissionId: 'submission-1', ip: undefined }));
      });

      it('never blocks the submission if the check fails: it still queues AI verification and returns the submission', async () => {
        mockSubmissionRisk.assess.mockRejectedValue(new Error('database unavailable'));

        const result = await service.submitTask('task-1', 'user-1', { textAnswer: 'Great service!' });

        expect(result).toHaveProperty('id', 'submission-1');
        expect(mockAiQueue.add).toHaveBeenCalledWith('verify-submission', expect.objectContaining({ submissionId: 'submission-1' }));
      });

      it('runs after the submission exists and before verification is queued, so its flags are in place when the AI decides', async () => {
        const order: string[] = [];
        mockSubmissionRepository.create.mockImplementation(async () => {
          order.push('create submission');
          return { id: 'submission-1' };
        });
        mockSubmissionRisk.assess.mockImplementation(async () => void order.push('risk check'));
        mockAiQueue.add.mockImplementation(async () => void order.push('queue verification'));

        await service.submitTask('task-1', 'user-1', { textAnswer: 'Great service!' });

        expect(order).toEqual(['create submission', 'risk check', 'queue verification']);
      });
    });

    it('should reject an oversized file', async () => {
      const file = {
        originalname: 'proof.jpg',
        mimetype: 'image/jpeg',
        size: 100 * 1024 * 1024,
        buffer: Buffer.from('abc'),
      } as Express.Multer.File;

      await expect(service.submitTask('task-1', 'user-1', {}, file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitTask — QR_SCAN and LOCATION_CHECKIN (deterministic, no AI queue)', () => {
    const qrTask = { ...task, taskType: 'QR_SCAN', configuration: { qrCode: 'STORE-42' } };
    const locationTask = { ...task, taskType: 'LOCATION_CHECKIN', configuration: { latitude: 12.9716, longitude: 77.5946, radiusMeters: 200 } };

    beforeEach(() => {
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockParticipantRepository.findByCampaignAndUser.mockResolvedValue(participant);
      mockSubmissionRepository.findLatestAttempt.mockResolvedValue(null);
      mockSubmissionRepository.create.mockResolvedValue({ id: 'submission-1' });
      mockSubmissionRepository.findById.mockResolvedValue({ id: 'submission-1', status: 'APPROVED' });
    });

    it('skips the proof-required check, the AI queue, and the verification job for QR_SCAN', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(qrTask);
      mockQrScanVerification.verify.mockReturnValue({ passed: true });

      const result = await service.submitTask('task-1', 'user-1', {});

      expect(result).toHaveProperty('id', 'submission-1');
      expect(mockAiQueue.add).not.toHaveBeenCalled();
      expect(mockSubmissionRepository.createVerificationJob).not.toHaveBeenCalled();
      expect(mockSubmissionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ verificationSource: 'SYSTEM' }));
    });

    it('approves a QR_SCAN submission immediately when the scanned code matches', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(qrTask);
      mockQrScanVerification.verify.mockReturnValue({ passed: true });

      await service.submitTask('task-1', 'user-1', { textAnswer: 'STORE-42' });

      expect(mockQrScanVerification.verify).toHaveBeenCalledWith(qrTask.configuration, 'STORE-42');
      expect(mockSubmissionService.aiApprove).toHaveBeenCalledWith('submission-1');
      expect(mockSubmissionService.aiReject).not.toHaveBeenCalled();
    });

    it('rejects a QR_SCAN submission immediately when the scanned code does not match', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(qrTask);
      mockQrScanVerification.verify.mockReturnValue({ passed: false, reason: 'That QR code does not match this task' });

      await service.submitTask('task-1', 'user-1', { textAnswer: 'WRONG' });

      expect(mockSubmissionService.aiReject).toHaveBeenCalledWith('submission-1', 'That QR code does not match this task');
      expect(mockSubmissionService.aiApprove).not.toHaveBeenCalled();
    });

    it('approves a LOCATION_CHECKIN submission immediately when within radius', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(locationTask);
      mockLocationCheckinVerification.verify.mockReturnValue({ passed: true, distanceMeters: 10 });

      await service.submitTask('task-1', 'user-1', { latitude: 12.9716, longitude: 77.5946 });

      expect(mockLocationCheckinVerification.verify).toHaveBeenCalledWith(locationTask.configuration, { latitude: 12.9716, longitude: 77.5946 });
      expect(mockSubmissionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { latitude: 12.9716, longitude: 77.5946 } }),
      );
      expect(mockSubmissionService.aiApprove).toHaveBeenCalledWith('submission-1');
    });

    it('rejects a LOCATION_CHECKIN submission with no location sent, without throwing a generic proof error', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(locationTask);
      mockLocationCheckinVerification.verify.mockReturnValue({ passed: false, reason: 'Your location is required for this task' });

      const result = await service.submitTask('task-1', 'user-1', {});

      expect(mockLocationCheckinVerification.verify).toHaveBeenCalledWith(locationTask.configuration, null);
      expect(mockSubmissionService.aiReject).toHaveBeenCalledWith('submission-1', 'Your location is required for this task');
      expect(result).toHaveProperty('id', 'submission-1');
    });

    it('still runs the risk check for a deterministic submission', async () => {
      mockCampaignTaskRepository.findById.mockResolvedValue(qrTask);
      mockQrScanVerification.verify.mockReturnValue({ passed: true });

      await service.submitTask('task-1', 'user-1', { textAnswer: 'STORE-42' }, undefined, { ip: '203.0.113.9' });

      expect(mockSubmissionRisk.assess).toHaveBeenCalledWith({
        submissionId: 'submission-1',
        userId: 'user-1',
        campaignId: 'campaign-1',
        ip: '203.0.113.9',
      });
    });
  });
});
