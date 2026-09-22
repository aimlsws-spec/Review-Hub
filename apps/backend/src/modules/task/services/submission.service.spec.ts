import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CampaignRepository } from '../../campaign/repositories';
import { CampaignParticipantRepository, CampaignTaskRepository, TaskSubmissionRepository } from '../repositories';

import { SubmissionService } from './submission.service';

describe('SubmissionService', () => {
  let service: SubmissionService;

  const mockSubmissionRepository = {
    findByUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateIfStatusIn: jest.fn(),
  };
  const mockCampaignTaskRepository = {
    findById: jest.fn(),
    countActiveByCampaignId: jest.fn(),
  };
  const mockCampaignRepository = { findById: jest.fn() };
  const mockParticipantRepository = { update: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  const pendingSubmission = {
    id: 'submission-1',
    participantId: 'participant-1',
    taskId: 'task-1',
    userId: 'user-1',
    status: 'PENDING_MANUAL',
  };
  const task = { id: 'task-1', campaignId: 'campaign-1', rewardAmount: null };
  const campaign = { id: 'campaign-1', rewardAmount: 50 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        { provide: TaskSubmissionRepository, useValue: mockSubmissionRepository },
        { provide: CampaignTaskRepository, useValue: mockCampaignTaskRepository },
        { provide: CampaignRepository, useValue: mockCampaignRepository },
        { provide: CampaignParticipantRepository, useValue: mockParticipantRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    jest.clearAllMocks();
  });

  describe('listMine', () => {
    it('should list submissions scoped to the current user', async () => {
      mockSubmissionRepository.findByUser.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listMine('user-1', { page: 1, limit: 20 } as never);
      expect(mockSubmissionRepository.findByUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  describe('getMine', () => {
    it('should return a submission owned by the user', async () => {
      mockSubmissionRepository.findById.mockResolvedValue({ id: 'submission-1', userId: 'user-1' });

      const result = await service.getMine('submission-1', 'user-1');
      expect(result).toHaveProperty('id', 'submission-1');
    });

    it('should hide a submission owned by someone else as not found', async () => {
      mockSubmissionRepository.findById.mockResolvedValue({ id: 'submission-1', userId: 'someone-else' });

      await expect(service.getMine('submission-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for an unknown submission', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(null);

      await expect(service.getMine('unknown', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve using the campaign-level reward when the task has no override', async () => {
      mockSubmissionRepository.findById.mockResolvedValueOnce(pendingSubmission).mockResolvedValue({ ...pendingSubmission, status: 'APPROVED', rewardAmount: 50 });
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(true);
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(campaign);
      mockCampaignTaskRepository.countActiveByCampaignId.mockResolvedValue(2);
      mockParticipantRepository.update
        .mockResolvedValueOnce({ id: 'participant-1', tasksCompleted: 1 })
        .mockResolvedValueOnce({ id: 'participant-1', tasksCompleted: 1, progress: 50 });

      const result = await service.approve('submission-1', 'admin-1');

      expect(result).toHaveProperty('status', 'APPROVED');
      expect(mockSubmissionRepository.updateIfStatusIn).toHaveBeenCalledWith(
        'submission-1',
        ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL'],
        expect.objectContaining({ status: 'APPROVED', rewardAmount: 50, reviewerId: 'admin-1' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'task.submission.approved',
        expect.objectContaining({ rewardAmount: 50, userId: 'user-1' }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'APPROVE', entity: 'TaskSubmission' }),
      );
    });

    it('should prefer a task-level reward override over the campaign default', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(pendingSubmission);
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(true);
      mockCampaignTaskRepository.findById.mockResolvedValue({ ...task, rewardAmount: 75 });
      mockCampaignRepository.findById.mockResolvedValue(campaign);
      mockCampaignTaskRepository.countActiveByCampaignId.mockResolvedValue(1);
      mockParticipantRepository.update.mockResolvedValue({ id: 'participant-1', tasksCompleted: 1 });

      await service.approve('submission-1', 'admin-1');

      expect(mockSubmissionRepository.updateIfStatusIn).toHaveBeenCalledWith('submission-1', expect.any(Array), expect.objectContaining({ rewardAmount: 75 }));
    });

    it('should mark the participant COMPLETED once every task is approved', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(pendingSubmission);
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(true);
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(campaign);
      mockCampaignTaskRepository.countActiveByCampaignId.mockResolvedValue(1);
      mockParticipantRepository.update.mockResolvedValueOnce({ id: 'participant-1', tasksCompleted: 1 });

      await service.approve('submission-1', 'admin-1');

      expect(mockParticipantRepository.update).toHaveBeenLastCalledWith('participant-1', expect.objectContaining({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      }));
    });

    it('should reject approving an already-approved submission', async () => {
      mockSubmissionRepository.findById.mockResolvedValue({ ...pendingSubmission, status: 'APPROVED' });

      await expect(service.approve('submission-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('loses cleanly when someone else decided in the moment between looking and writing', async () => {
      // It looked open, but by the time of the write another decision had landed.
      mockSubmissionRepository.findById.mockResolvedValueOnce(pendingSubmission).mockResolvedValue({ ...pendingSubmission, status: 'REJECTED' });
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(false);
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignRepository.findById.mockResolvedValue(campaign);

      await expect(service.approve('submission-1', 'admin-1')).rejects.toThrow(/already rejected/);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockParticipantRepository.update).not.toHaveBeenCalled();
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should reject a pending submission with a reason', async () => {
      mockSubmissionRepository.findById.mockResolvedValueOnce(pendingSubmission).mockResolvedValue({ ...pendingSubmission, status: 'REJECTED' });
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(true);

      const result = await service.reject('submission-1', 'admin-1', { rejectionReason: 'Blurry screenshot' });

      expect(result).toHaveProperty('status', 'REJECTED');
      expect(mockSubmissionRepository.updateIfStatusIn).toHaveBeenCalledWith(
        'submission-1',
        ['PENDING', 'AI_PROCESSING', 'PENDING_MANUAL'],
        expect.objectContaining({ status: 'REJECTED', rejectionReason: 'Blurry screenshot', reviewerId: 'admin-1' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.submission.rejected', expect.any(Object));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'REJECT', entity: 'TaskSubmission' }),
      );
    });

    it('should reject reviewing an unknown submission', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(null);

      await expect(service.reject('unknown', 'admin-1', { rejectionReason: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('loses cleanly when the submission was decided in the moment between looking and writing', async () => {
      mockSubmissionRepository.findById.mockResolvedValueOnce(pendingSubmission).mockResolvedValue({ ...pendingSubmission, status: 'APPROVED' });
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(false);

      await expect(service.reject('submission-1', 'admin-1', { rejectionReason: 'Blurry screenshot' })).rejects.toThrow(/already approved/);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('deferToManualReview', () => {
    it('moves a submission that is still waiting to manual review, and records it', async () => {
      mockSubmissionRepository.findById.mockResolvedValueOnce({ ...pendingSubmission, status: 'PENDING' }).mockResolvedValue({ ...pendingSubmission, status: 'PENDING_MANUAL' });
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(true);

      const result = await service.deferToManualReview('submission-1');

      expect(mockSubmissionRepository.updateIfStatusIn).toHaveBeenCalledWith('submission-1', ['PENDING', 'AI_PROCESSING'], { status: 'PENDING_MANUAL' });
      expect(result).toHaveProperty('status', 'PENDING_MANUAL');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorType: 'SYSTEM', after: { status: 'PENDING_MANUAL' } }));
    });

    it('leaves a decision a person made while the automatic check was running, and says nothing more', async () => {
      // Read as still open, but a reviewer approved before the write.
      mockSubmissionRepository.findById.mockResolvedValue({ ...pendingSubmission, status: 'PENDING' });
      mockSubmissionRepository.updateIfStatusIn.mockResolvedValue(false);

      await expect(service.deferToManualReview('submission-1')).resolves.toBeDefined();

      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });

    it('refuses one that was already decided when the automatic check finished', async () => {
      mockSubmissionRepository.findById.mockResolvedValue({ ...pendingSubmission, status: 'APPROVED' });

      await expect(service.deferToManualReview('submission-1')).rejects.toThrow(BadRequestException);
      expect(mockSubmissionRepository.updateIfStatusIn).not.toHaveBeenCalled();
    });
  });
});
