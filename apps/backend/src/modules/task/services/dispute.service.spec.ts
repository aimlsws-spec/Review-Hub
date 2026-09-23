import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { DisputeRepository, TaskSubmissionRepository } from '../repositories';

import { DisputeService } from './dispute.service';
import { SubmissionService } from './submission.service';

describe('DisputeService', () => {
  let service: DisputeService;

  const mockDisputeRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySubmissionId: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const mockSubmissionRepository = { findById: jest.fn(), update: jest.fn() };
  const mockSubmissionService = { approve: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };

  const rejectedSubmission = { id: 'submission-1', userId: 'user-1', status: 'REJECTED' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        { provide: DisputeRepository, useValue: mockDisputeRepository },
        { provide: TaskSubmissionRepository, useValue: mockSubmissionRepository },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
    jest.clearAllMocks();
  });

  describe('createDispute', () => {
    it('throws NotFoundException for a submission that does not exist or is not the caller\'s', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(null);
      await expect(service.createDispute('submission-1', 'user-1', { reason: 'x' })).rejects.toThrow(NotFoundException);

      mockSubmissionRepository.findById.mockResolvedValue({ ...rejectedSubmission, userId: 'someone-else' });
      await expect(service.createDispute('submission-1', 'user-1', { reason: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('only allows disputing a REJECTED submission', async () => {
      mockSubmissionRepository.findById.mockResolvedValue({ ...rejectedSubmission, status: 'PENDING' });

      await expect(service.createDispute('submission-1', 'user-1', { reason: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('rejects a second dispute on the same submission', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(rejectedSubmission);
      mockDisputeRepository.findBySubmissionId.mockResolvedValue({ id: 'existing-dispute' });

      await expect(service.createDispute('submission-1', 'user-1', { reason: 'x' })).rejects.toThrow(BadRequestException);
      expect(mockDisputeRepository.create).not.toHaveBeenCalled();
    });

    it('creates the dispute and audits it', async () => {
      mockSubmissionRepository.findById.mockResolvedValue(rejectedSubmission);
      mockDisputeRepository.findBySubmissionId.mockResolvedValue(null);
      mockDisputeRepository.create.mockResolvedValue({ id: 'dispute-1', status: 'OPEN' });

      const result = await service.createDispute('submission-1', 'user-1', { reason: 'I completed it correctly' });

      expect(result).toEqual({ id: 'dispute-1', status: 'OPEN' });
      expect(mockDisputeRepository.create).toHaveBeenCalledWith({
        submissionId: 'submission-1',
        userId: 'user-1',
        reason: 'I completed it correctly',
        status: 'OPEN',
      });
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'Dispute' }));
    });
  });

  describe('getAdminDisputes', () => {
    it('returns the standard {data, total, page, limit} pagination shape', async () => {
      mockDisputeRepository.findMany.mockResolvedValue([{ id: 'dispute-1' }]);
      mockDisputeRepository.count.mockResolvedValue(1);

      const result = await service.getAdminDisputes({ page: 1, limit: 20, skip: 0 } as never);

      expect(result).toEqual({ data: [{ id: 'dispute-1' }], total: 1, page: 1, limit: 20 });
    });

    it('filters by status when given', async () => {
      mockDisputeRepository.findMany.mockResolvedValue([]);
      mockDisputeRepository.count.mockResolvedValue(0);

      await service.getAdminDisputes({ page: 1, limit: 20, skip: 0, status: 'OPEN' } as never);

      expect(mockDisputeRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({ status: 'OPEN' }));
      expect(mockDisputeRepository.count).toHaveBeenCalledWith({ status: 'OPEN' });
    });
  });

  describe('resolveDispute', () => {
    const openDispute = { id: 'dispute-1', submissionId: 'submission-1', userId: 'user-1', status: 'OPEN' };

    it('throws NotFoundException for an unknown dispute', async () => {
      mockDisputeRepository.findById.mockResolvedValue(null);
      await expect(service.resolveDispute('dispute-1', 'admin-1', { decision: 'UPHELD' })).rejects.toThrow(NotFoundException);
    });

    it('rejects resolving an already-resolved dispute', async () => {
      mockDisputeRepository.findById.mockResolvedValue({ ...openDispute, status: 'UPHELD' });
      await expect(service.resolveDispute('dispute-1', 'admin-1', { decision: 'UPHELD' })).rejects.toThrow(BadRequestException);
    });

    it('upholds without touching the submission', async () => {
      mockDisputeRepository.findById.mockResolvedValue(openDispute);
      mockDisputeRepository.update.mockResolvedValue({ ...openDispute, status: 'UPHELD' });

      await service.resolveDispute('dispute-1', 'admin-1', { decision: 'UPHELD', notes: 'Evidence supports rejection' });

      expect(mockSubmissionRepository.update).not.toHaveBeenCalled();
      expect(mockSubmissionService.approve).not.toHaveBeenCalled();
      expect(mockDisputeRepository.update).toHaveBeenCalledWith(
        'dispute-1',
        expect.objectContaining({ status: 'UPHELD', resolvedBy: 'admin-1' }),
      );
    });

    it('reversing reopens the submission to PENDING then runs it through the normal approval path', async () => {
      mockDisputeRepository.findById.mockResolvedValue(openDispute);
      mockDisputeRepository.update.mockResolvedValue({ ...openDispute, status: 'REVERSED' });

      await service.resolveDispute('dispute-1', 'admin-1', { decision: 'REVERSED' });

      expect(mockSubmissionRepository.update).toHaveBeenCalledWith('submission-1', { status: 'PENDING' });
      expect(mockSubmissionService.approve).toHaveBeenCalledWith('submission-1', 'admin-1');
    });

    it('emits a resolution event and audits the decision', async () => {
      mockDisputeRepository.findById.mockResolvedValue(openDispute);
      mockDisputeRepository.update.mockResolvedValue({ ...openDispute, status: 'UPHELD' });

      await service.resolveDispute('dispute-1', 'admin-1', { decision: 'UPHELD', notes: 'No new evidence' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'task.dispute.resolved',
        expect.objectContaining({ decision: 'UPHELD', notes: 'No new evidence' }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'STATUS_CHANGE', entity: 'Dispute' }));
    });
  });
});
