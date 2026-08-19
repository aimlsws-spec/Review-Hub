import { Test, TestingModule } from '@nestjs/testing';

import { UserManagementService } from '../services';

import { UserManagementController } from './user-management.controller';

describe('UserManagementController', () => {
  let controller: UserManagementController;

  const mockUserManagementService = {
    list: jest.fn(),
    getById: jest.fn(),
    suspend: jest.fn(),
    ban: jest.fn(),
    reactivate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [{ provide: UserManagementService, useValue: mockUserManagementService }],
    }).compile();

    controller = module.get<UserManagementController>(UserManagementController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockUserManagementService.list).toHaveBeenCalledWith(query);
  });

  it('getById should delegate to the service', async () => {
    await controller.getById('user-1');
    expect(mockUserManagementService.getById).toHaveBeenCalledWith('user-1');
  });

  it('suspend should delegate to the service', async () => {
    await controller.suspend('user-1', { reason: 'x' }, 'admin-1');
    expect(mockUserManagementService.suspend).toHaveBeenCalledWith('user-1', 'admin-1', { reason: 'x' });
  });

  it('ban should delegate to the service', async () => {
    await controller.ban('user-1', { reason: 'x' }, 'admin-1');
    expect(mockUserManagementService.ban).toHaveBeenCalledWith('user-1', 'admin-1', { reason: 'x' });
  });

  it('reactivate should delegate to the service', async () => {
    await controller.reactivate('user-1', 'admin-1');
    expect(mockUserManagementService.reactivate).toHaveBeenCalledWith('user-1', 'admin-1');
  });
});
