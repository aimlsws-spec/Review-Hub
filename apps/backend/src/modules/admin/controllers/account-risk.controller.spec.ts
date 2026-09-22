import { Test, TestingModule } from '@nestjs/testing';

import { ROLES_KEY } from '../../auth/decorators';
import { AccountRiskService } from '../../risk/services';

import { AccountRiskController } from './account-risk.controller';

describe('AccountRiskController', () => {
  let controller: AccountRiskController;
  const mockService = { assess: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountRiskController],
      providers: [{ provide: AccountRiskService, useValue: mockService }],
    }).compile();

    controller = module.get<AccountRiskController>(AccountRiskController);
    jest.clearAllMocks();
  });

  it("returns the risk report for the requested user", async () => {
    const report = { score: 65, level: 'HIGH', deviceRisk: 40, linkPoints: 25, linkedAccounts: [], recentIps: [] };
    mockService.assess.mockResolvedValue(report);

    await expect(controller.getUserRisk('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).resolves.toBe(report);

    expect(mockService.assess).toHaveBeenCalledWith('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  });

  it('is restricted to admins', () => {
    // Linked accounts and IP history are sensitive: only admins may read them.
    const roles = Reflect.getMetadata(ROLES_KEY, AccountRiskController) as string[] | undefined;

    expect(roles).toEqual(['ADMIN']);
  });
});
