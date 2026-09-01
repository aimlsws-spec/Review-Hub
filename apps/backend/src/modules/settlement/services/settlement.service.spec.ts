import { Test, TestingModule } from '@nestjs/testing';

import { SettlementRepository } from '../repositories';

import { InvoiceService } from './invoice.service';
import { SettlementService } from './settlement.service';

describe('SettlementService', () => {
  let service: SettlementService;

  const mockSettlementRepository = {
    findMerchantIdsActiveInPeriod: jest.fn(),
    generateForMerchant: jest.fn(),
    findByMerchant: jest.fn(),
  };
  const mockInvoiceService = {
    generateForSettlement: jest.fn(),
  };

  const periodStart = new Date('2026-08-30T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T00:00:00.000Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: SettlementRepository, useValue: mockSettlementRepository },
        { provide: InvoiceService, useValue: mockInvoiceService },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    jest.clearAllMocks();
  });

  describe('generateForPeriod', () => {
    it('should generate a settlement and invoice for every active merchant in the period', async () => {
      mockSettlementRepository.findMerchantIdsActiveInPeriod.mockResolvedValue(['merchant-1', 'merchant-2']);
      mockSettlementRepository.generateForMerchant
        .mockResolvedValueOnce({ id: 'settlement-1' })
        .mockResolvedValueOnce({ id: 'settlement-2' });

      const result = await service.generateForPeriod(periodStart, periodEnd);

      expect(result).toEqual([{ id: 'settlement-1' }, { id: 'settlement-2' }]);
      expect(mockInvoiceService.generateForSettlement).toHaveBeenCalledWith('settlement-1');
      expect(mockInvoiceService.generateForSettlement).toHaveBeenCalledWith('settlement-2');
    });

    it('should skip merchants the repository declines to generate a settlement for (no wallet yet)', async () => {
      mockSettlementRepository.findMerchantIdsActiveInPeriod.mockResolvedValue(['merchant-1']);
      mockSettlementRepository.generateForMerchant.mockResolvedValue(null);

      const result = await service.generateForPeriod(periodStart, periodEnd);

      expect(result).toEqual([]);
      expect(mockInvoiceService.generateForSettlement).not.toHaveBeenCalled();
    });
  });

  describe('generateForPreviousDay', () => {
    it('should compute a full UTC-day period ending at today\'s UTC midnight', async () => {
      mockSettlementRepository.findMerchantIdsActiveInPeriod.mockResolvedValue([]);

      await service.generateForPreviousDay();

      const [start, end] = mockSettlementRepository.findMerchantIdsActiveInPeriod.mock.calls[0];
      expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
      expect(end.getUTCHours()).toBe(0);
      expect(end.getUTCMinutes()).toBe(0);
    });
  });

  describe('listForMerchant', () => {
    it('should delegate to the repository', async () => {
      mockSettlementRepository.findByMerchant.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listForMerchant('merchant-1', 1, 20);
      expect(mockSettlementRepository.findByMerchant).toHaveBeenCalledWith('merchant-1', 1, 20);
    });
  });
});
