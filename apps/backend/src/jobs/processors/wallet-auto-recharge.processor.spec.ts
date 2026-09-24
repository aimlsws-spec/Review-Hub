import { Test, TestingModule } from '@nestjs/testing';

import { AutoRechargeService } from '../../modules/merchant/services';

import { WalletAutoRechargeProcessor } from './wallet-auto-recharge.processor';

describe('WalletAutoRechargeProcessor', () => {
  let processor: WalletAutoRechargeProcessor;

  const mockAutoRechargeService = { runSweep: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletAutoRechargeProcessor,
        { provide: AutoRechargeService, useValue: mockAutoRechargeService },
      ],
    }).compile();

    processor = module.get<WalletAutoRechargeProcessor>(WalletAutoRechargeProcessor);
    jest.clearAllMocks();
  });

  it('should run the auto-recharge sweep', async () => {
    mockAutoRechargeService.runSweep.mockResolvedValue({ attempted: 2, succeeded: 2, failed: 0 });

    await processor.process({ name: 'sweep' } as never);

    expect(mockAutoRechargeService.runSweep).toHaveBeenCalled();
  });
});
