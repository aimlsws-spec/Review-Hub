import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogRepository } from '../repositories';

import { AuditLogViewerService } from './audit-log-viewer.service';

describe('AuditLogViewerService', () => {
  let service: AuditLogViewerService;

  const mockAuditLogRepository = { findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogViewerService,
        { provide: AuditLogRepository, useValue: mockAuditLogRepository },
      ],
    }).compile();

    service = module.get<AuditLogViewerService>(AuditLogViewerService);
    jest.clearAllMocks();
  });

  it('should delegate to the repository with the query filters', async () => {
    mockAuditLogRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    await service.list({ page: 1, limit: 20, entity: 'Campaign' } as never);
    expect(mockAuditLogRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, entity: 'Campaign' }),
    );
  });
});
