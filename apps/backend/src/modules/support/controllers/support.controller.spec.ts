import { Test, TestingModule } from '@nestjs/testing';

import { SupportService } from '../services';

import { SupportController } from './support.controller';

describe('SupportController', () => {
  let controller: SupportController;

  const mockSupportService = {
    createAsUser: jest.fn(),
    listMineAsUser: jest.fn(),
    getForUser: jest.fn(),
    replyAsUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [{ provide: SupportService, useValue: mockSupportService }],
    }).compile();

    controller = module.get<SupportController>(SupportController);
    jest.clearAllMocks();
  });

  it('create should delegate to the service', async () => {
    const dto = { subject: 'Help', description: 'Something is broken' };
    await controller.create('user-1', dto);
    expect(mockSupportService.createAsUser).toHaveBeenCalledWith('user-1', dto);
  });

  it('listMine should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.listMine('user-1', query as never);
    expect(mockSupportService.listMineAsUser).toHaveBeenCalledWith('user-1', query);
  });

  it('getMine should delegate to the service', async () => {
    await controller.getMine('ticket-1', 'user-1');
    expect(mockSupportService.getForUser).toHaveBeenCalledWith('ticket-1', 'user-1');
  });

  it('reply should delegate to the service', async () => {
    const dto = { message: 'More info' };
    await controller.reply('ticket-1', 'user-1', dto);
    expect(mockSupportService.replyAsUser).toHaveBeenCalledWith('ticket-1', 'user-1', dto);
  });
});
