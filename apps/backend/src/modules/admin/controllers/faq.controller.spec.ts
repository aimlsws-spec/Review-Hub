import { Test, TestingModule } from '@nestjs/testing';

import { FaqService } from '../services';

import { FaqController } from './faq.controller';

describe('FaqController', () => {
  let controller: FaqController;

  const mockFaqService = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqController],
      providers: [{ provide: FaqService, useValue: mockFaqService }],
    }).compile();

    controller = module.get<FaqController>(FaqController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockFaqService.list).toHaveBeenCalledWith(query);
  });

  it('create should delegate to the service', async () => {
    const dto = { category: 'Rewards', question: 'When?', answer: 'Soon' };
    await controller.create(dto, 'admin-1');
    expect(mockFaqService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('update should delegate to the service', async () => {
    await controller.update('faq-1', { answer: 'Updated' }, 'admin-1');
    expect(mockFaqService.update).toHaveBeenCalledWith('faq-1', { answer: 'Updated' }, 'admin-1');
  });

  it('remove should delegate to the service', async () => {
    await controller.remove('faq-1', 'admin-1');
    expect(mockFaqService.remove).toHaveBeenCalledWith('faq-1', 'admin-1');
  });
});
