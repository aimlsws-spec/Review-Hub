import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogViewerService } from '../services';

import { AuditLogController } from './audit-log.controller';

describe('AuditLogController', () => {
  let controller: AuditLogController;

  const mockAuditLogViewerService = { list: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogViewerService, useValue: mockAuditLogViewerService }],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockAuditLogViewerService.list).toHaveBeenCalledWith(query);
  });
});
