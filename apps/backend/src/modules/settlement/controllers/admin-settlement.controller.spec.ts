import { Test, TestingModule } from '@nestjs/testing';

import { SettlementService } from '../services';

import { AdminSettlementController } from './admin-settlement.controller';

describe('AdminSettlementController', () => {
  let controller: AdminSettlementController;

  const mockSettlementService = { generateForPeriod: jest.fn(), generateForPreviousDay: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSettlementController],
      providers: [{ provide: SettlementService, useValue: mockSettlementService }],
    }).compile();

    controller = module.get<AdminSettlementController>(AdminSettlementController);
    jest.clearAllMocks();
  });

  it('should generate for the previous day when no period is given', async () => {
    mockSettlementService.generateForPreviousDay.mockResolvedValue([]);

    await controller.generate({});

    expect(mockSettlementService.generateForPreviousDay).toHaveBeenCalled();
    expect(mockSettlementService.generateForPeriod).not.toHaveBeenCalled();
  });

  it('should generate for an explicit period when both dates are given', async () => {
    mockSettlementService.generateForPeriod.mockResolvedValue([]);

    await controller.generate({ periodStart: '2026-08-30T00:00:00.000Z', periodEnd: '2026-08-31T00:00:00.000Z' });

    expect(mockSettlementService.generateForPeriod).toHaveBeenCalledWith(
      new Date('2026-08-30T00:00:00.000Z'), new Date('2026-08-31T00:00:00.000Z'),
    );
    expect(mockSettlementService.generateForPreviousDay).not.toHaveBeenCalled();
  });
});
