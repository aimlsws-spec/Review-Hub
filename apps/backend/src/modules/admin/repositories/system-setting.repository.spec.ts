import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SystemSettingRepository } from './system-setting.repository';

describe('SystemSettingRepository', () => {
  let repository: SystemSettingRepository;

  const mockPrisma = {
    systemSetting: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<SystemSettingRepository>(SystemSettingRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should exclude soft-deleted settings and filter by category when given', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([{ key: 'withdrawal.min_amount' }]);

      await repository.findAll('withdrawal');
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, category: 'withdrawal' } }),
      );
    });

    it('should not filter by category when omitted', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      await repository.findAll();
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });
  });

  describe('update', () => {
    it('should update a setting by key', async () => {
      mockPrisma.systemSetting.update.mockResolvedValue({ key: 'withdrawal.min_amount', value: 500 });

      await repository.update('withdrawal.min_amount', { value: 500 });
      expect(mockPrisma.systemSetting.update).toHaveBeenCalledWith({
        where: { key: 'withdrawal.min_amount' },
        data: { value: 500 },
      });
    });
  });
});
