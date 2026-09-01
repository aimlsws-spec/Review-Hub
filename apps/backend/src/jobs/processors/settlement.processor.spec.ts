import { Test, TestingModule } from '@nestjs/testing';

import { SettlementService } from '../../modules/settlement/services';

import { SettlementProcessor } from './settlement.processor';

describe('SettlementProcessor', () => {
  let processor: SettlementProcessor;

  const mockSettlementService = { generateForPreviousDay: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementProcessor,
        { provide: SettlementService, useValue: mockSettlementService },
      ],
    }).compile();

    processor = module.get<SettlementProcessor>(SettlementProcessor);
    jest.clearAllMocks();
  });

  it('should generate settlements for the previous day', async () => {
    mockSettlementService.generateForPreviousDay.mockResolvedValue([{ id: 'settlement-1' }]);

    await processor.process({ name: 'generate-daily' } as never);

    expect(mockSettlementService.generateForPreviousDay).toHaveBeenCalled();
  });
});
