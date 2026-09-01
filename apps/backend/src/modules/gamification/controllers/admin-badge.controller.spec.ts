import { Test, TestingModule } from '@nestjs/testing';

import { BadgeAdminService } from '../services';

import { AdminBadgeController } from './admin-badge.controller';

describe('AdminBadgeController', () => {
  let controller: AdminBadgeController;

  const mockBadgeAdminService = { list: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBadgeController],
      providers: [{ provide: BadgeAdminService, useValue: mockBadgeAdminService }],
    }).compile();

    controller = module.get<AdminBadgeController>(AdminBadgeController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockBadgeAdminService.list).toHaveBeenCalledWith(query);
  });

  it('create should delegate to the service', async () => {
    const dto = { code: 'FIRST', name: 'First', description: 'x', criteriaType: 'XP_THRESHOLD', criteriaValue: 10 };
    await controller.create(dto as never, 'admin-1');
    expect(mockBadgeAdminService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('remove should delegate to the service', async () => {
    await controller.remove('badge-1', 'admin-1');
    expect(mockBadgeAdminService.remove).toHaveBeenCalledWith('badge-1', 'admin-1');
  });
});
