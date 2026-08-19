import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma/prisma.service';

import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockPrisma = {
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    jest.clearAllMocks();
  });

  it('should write an audit log row with the given fields', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await service.record({
      actorId: 'admin-1',
      actorType: 'ADMIN',
      entity: 'Campaign',
      entityId: 'campaign-1',
      action: 'APPROVE',
      before: { status: 'PENDING_REVIEW' },
      after: { status: 'APPROVED' },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        actorType: 'ADMIN',
        entity: 'Campaign',
        entityId: 'campaign-1',
        action: 'APPROVE',
        before: { status: 'PENDING_REVIEW' },
        after: { status: 'APPROVED' },
        ipAddress: undefined,
      },
    });
  });
});
