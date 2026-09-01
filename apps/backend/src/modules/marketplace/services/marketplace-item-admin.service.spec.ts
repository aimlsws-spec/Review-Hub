import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MarketplaceItemRepository, RedemptionRepository } from '../repositories';

import { MarketplaceItemAdminService } from './marketplace-item-admin.service';

describe('MarketplaceItemAdminService', () => {
  let service: MarketplaceItemAdminService;

  const mockItemRepository = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), softDelete: jest.fn() };
  const mockRedemptionRepository = { findAll: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceItemAdminService,
        { provide: MarketplaceItemRepository, useValue: mockItemRepository },
        { provide: RedemptionRepository, useValue: mockRedemptionRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<MarketplaceItemAdminService>(MarketplaceItemAdminService);
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should throw NotFoundException for an unknown item', async () => {
      mockItemRepository.findById.mockResolvedValue(null);
      await expect(service.getById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create the item and audit it', async () => {
      mockItemRepository.create.mockResolvedValue({ id: 'item-1', title: 'Gift Card', costAmount: 100 });

      const result = await service.create({ title: 'Gift Card', description: 'x', costAmount: 100 } as never, 'admin-1');

      expect(result).toHaveProperty('id', 'item-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'admin-1', entity: 'MarketplaceItem', action: 'CREATE' }));
    });
  });

  describe('listRedemptions', () => {
    it('should delegate to the redemption repository', async () => {
      mockRedemptionRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listRedemptions(1, 20);
      expect(mockRedemptionRepository.findAll).toHaveBeenCalledWith(1, 20);
    });
  });
});
