import { Test, TestingModule } from '@nestjs/testing';

import { AdminRole } from '@common/enums';

import { ROLES_KEY } from '../../auth/decorators';
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
    getRoles: jest.fn(),
    grantRole: jest.fn(),
    revokeRole: jest.fn(),
    getReferrals: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [{ provide: UserManagementService, useValue: mockUserManagementService }],
    }).compile();

    controller = module.get<UserManagementController>(UserManagementController);
    jest.clearAllMocks();
  });

  it.each(['getRoles', 'grantRole', 'revokeRole'] as const)('%s is for super admins only', (method) => {
    expect(Reflect.getMetadata(ROLES_KEY, UserManagementController.prototype[method])).toEqual([AdminRole.SuperAdmin]);
  });

  it('passes the role change and the acting super admin to the service', async () => {
    await controller.grantRole('user-1', 'FINANCE_TEAM', 'super-1');
    await controller.revokeRole('user-1', 'FINANCE_TEAM', 'super-1');

    expect(mockUserManagementService.grantRole).toHaveBeenCalledWith('user-1', 'FINANCE_TEAM', 'super-1');
    expect(mockUserManagementService.revokeRole).toHaveBeenCalledWith('user-1', 'FINANCE_TEAM', 'super-1');
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

  it('passes the page of referrals asked for', async () => {
    await controller.getReferrals('user-1', { page: 2, limit: 10 } as never);

    expect(mockUserManagementService.getReferrals).toHaveBeenCalledWith('user-1', 2, 10);
  });
});
