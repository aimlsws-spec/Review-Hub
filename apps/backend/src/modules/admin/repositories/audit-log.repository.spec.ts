import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { AuditLogRepository } from './audit-log.repository';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;

  const mockPrisma = {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<AuditLogRepository>(AuditLogRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by entity, actorId, and action when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 20, entity: 'Campaign', actorId: 'admin-1', action: 'APPROVE' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'Campaign', actorId: 'admin-1', action: 'APPROVE' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return an unfiltered page when no filters are given', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });
});
