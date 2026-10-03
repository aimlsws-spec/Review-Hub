import { Test, TestingModule } from '@nestjs/testing';

import { TeamService } from '../services';

import { PublicMerchantController } from './public.controller';

describe('PublicMerchantController', () => {
  let controller: PublicMerchantController;

  const mockTeamService = { acceptInvitation: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicMerchantController],
      providers: [{ provide: TeamService, useValue: mockTeamService }],
    }).compile();

    controller = module.get<PublicMerchantController>(PublicMerchantController);
    jest.clearAllMocks();
  });

  it('accepts the invitation for the signed-in user, never for an id from the request', async () => {
    mockTeamService.acceptInvitation.mockResolvedValue({ message: 'Invitation accepted successfully' });

    const result = await controller.acceptInvite({ token: 'token-1' }, 'user-1', 'teammate@test.com');

    expect(mockTeamService.acceptInvitation).toHaveBeenCalledWith('token-1', 'user-1', 'teammate@test.com');
    expect(result).toEqual({ message: 'Invitation accepted successfully' });
  });
});
