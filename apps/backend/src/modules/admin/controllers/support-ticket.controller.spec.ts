import { Test, TestingModule } from '@nestjs/testing';

import { SupportService } from '../../support/services';

import { AdminSupportTicketController } from './support-ticket.controller';

describe('AdminSupportTicketController', () => {
  let controller: AdminSupportTicketController;

  const mockSupportService = {
    listAll: jest.fn(),
    getForAdmin: jest.fn(),
    replyAsAdmin: jest.fn(),
    updateStatus: jest.fn(),
    assign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSupportTicketController],
      providers: [{ provide: SupportService, useValue: mockSupportService }],
    }).compile();

    controller = module.get<AdminSupportTicketController>(AdminSupportTicketController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockSupportService.listAll).toHaveBeenCalledWith(query);
  });

  it('getOne should delegate to the service', async () => {
    await controller.getOne('ticket-1');
    expect(mockSupportService.getForAdmin).toHaveBeenCalledWith('ticket-1');
  });

  it('reply should delegate to the service', async () => {
    const dto = { message: 'We are on it', internalNote: false };
    await controller.reply('ticket-1', 'admin-1', dto);
    expect(mockSupportService.replyAsAdmin).toHaveBeenCalledWith('ticket-1', 'admin-1', dto);
  });

  it('updateStatus should delegate to the service', async () => {
    const dto = { status: 'RESOLVED' as const };
    await controller.updateStatus('ticket-1', 'admin-1', dto);
    expect(mockSupportService.updateStatus).toHaveBeenCalledWith('ticket-1', 'admin-1', dto);
  });

  it('assign should delegate to the service', async () => {
    const dto = { assignedToId: 'admin-2' };
    await controller.assign('ticket-1', 'admin-1', dto);
    expect(mockSupportService.assign).toHaveBeenCalledWith('ticket-1', 'admin-1', dto);
  });
});
