import { Test, TestingModule } from '@nestjs/testing';

import { CmsPageService } from '../services';

import { CmsPageController } from './cms-page.controller';

describe('CmsPageController', () => {
  let controller: CmsPageController;

  const mockCmsPageService = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CmsPageController],
      providers: [{ provide: CmsPageService, useValue: mockCmsPageService }],
    }).compile();

    controller = module.get<CmsPageController>(CmsPageController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockCmsPageService.list).toHaveBeenCalledWith(query);
  });

  it('getById should delegate to the service', async () => {
    await controller.getById('page-1');
    expect(mockCmsPageService.getById).toHaveBeenCalledWith('page-1');
  });

  it('create should delegate to the service', async () => {
    const dto = { title: 'About', slug: 'about', content: 'Content here' };
    await controller.create(dto, 'admin-1');
    expect(mockCmsPageService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('update should delegate to the service', async () => {
    const dto = { title: 'Updated' };
    await controller.update('page-1', dto, 'admin-1');
    expect(mockCmsPageService.update).toHaveBeenCalledWith('page-1', dto, 'admin-1');
  });

  it('remove should delegate to the service', async () => {
    await controller.remove('page-1', 'admin-1');
    expect(mockCmsPageService.remove).toHaveBeenCalledWith('page-1', 'admin-1');
  });
});
