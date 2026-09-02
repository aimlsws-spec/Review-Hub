import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { AiAssistService } from '../../ai/services/ai-assist.service';
import { CampaignRepository } from '../../campaign/repositories';
import { MerchantRepository } from '../../merchant/repositories';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';

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
      ],
    }).compile();

    service = module.get<TaskParticipationService>(TaskParticipationService);
    jest.clearAllMocks();
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
        submission: { userId: 'someone-else' },
      });

      await service.submitTask('task-1', 'user-1', {}, file);

      expect(mockStorageService.saveFile).toHaveBeenCalled();
      expect(mockSubmissionRepository.createAttachment).toHaveBeenCalled();
      expect(mockSubmissionRepository.createFraudFlag).toHaveBeenCalledWith(
        expect.objectContaining({ riskLevel: 'HIGH' }),
      );
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
});
