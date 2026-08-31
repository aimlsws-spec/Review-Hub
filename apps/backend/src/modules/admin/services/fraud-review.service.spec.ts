import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { FraudFlagRepository } from '../repositories';

import { FraudReviewService } from './fraud-review.service';

describe('FraudReviewService', () => {
  let service: FraudReviewService;

  const mockFraudFlagRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    resolve: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudReviewService,
        { provide: FraudFlagRepository, useValue: mockFraudFlagRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<FraudReviewService>(FraudReviewService);
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    it('should mark an unresolved flag resolved and audit it', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue({ id: 'flag-1', resolved: false });
      mockFraudFlagRepository.resolve.mockResolvedValue({ id: 'flag-1', resolved: true });

      const result = await service.resolve('flag-1', 'admin-1');

      expect(result).toHaveProperty('resolved', true);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', entity: 'SubmissionFraudFlag', action: 'UPDATE' }),
      );
    });

    it('should throw NotFoundException for an unknown flag', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue(null);

      await expect(service.resolve('unknown', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject resolving an already-resolved flag', async () => {
      mockFraudFlagRepository.findById.mockResolvedValue({ id: 'flag-1', resolved: true });

      await expect(service.resolve('flag-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });
});
