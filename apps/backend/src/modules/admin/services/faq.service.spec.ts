import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { FaqRepository } from '../repositories';

import { FaqService } from './faq.service';

describe('FaqService', () => {
  let service: FaqService;

  const mockFaqRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: FaqRepository, useValue: mockFaqRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<FaqService>(FaqService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and audit', async () => {
      mockFaqRepository.create.mockResolvedValue({ id: 'faq-1', category: 'Rewards', question: 'When?' });

      await service.create({ category: 'Rewards', question: 'When?', answer: 'Soon' }, 'admin-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'FAQ' }));
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for an unknown FAQ', async () => {
      mockFaqRepository.findById.mockResolvedValue(null);

      await expect(service.update('unknown', {}, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should update and audit an existing FAQ', async () => {
      mockFaqRepository.findById.mockResolvedValue({ id: 'faq-1' });
      mockFaqRepository.update.mockResolvedValue({ id: 'faq-1', answer: 'Updated' });

      const result = await service.update('faq-1', { answer: 'Updated' }, 'admin-1');
      expect(result).toHaveProperty('answer', 'Updated');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE' }));
    });
  });

  describe('remove', () => {
    it('should soft delete and audit', async () => {
      mockFaqRepository.findById.mockResolvedValue({ id: 'faq-1' });
      mockFaqRepository.softDelete.mockResolvedValue({ id: 'faq-1', deletedAt: new Date() });

      await service.remove('faq-1', 'admin-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });
  });
});
