import { Test, TestingModule } from '@nestjs/testing';

import { CmsPageService } from '../services';

import { PublicCmsPageController } from './public-cms-page.controller';

describe('PublicCmsPageController', () => {
  let controller: PublicCmsPageController;

  const mockCmsPageService = { getPublishedBySlug: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCmsPageController],
      providers: [{ provide: CmsPageService, useValue: mockCmsPageService }],
    }).compile();

    controller = module.get<PublicCmsPageController>(PublicCmsPageController);
    jest.clearAllMocks();
  });

  it('returns the published page for the slug', async () => {
    const page = { slug: 'reward-policy', title: 'Reward Policy', content: 'Rewards are paid for honest feedback.' };
    mockCmsPageService.getPublishedBySlug.mockResolvedValue(page);

    await expect(controller.getBySlug({ slug: 'reward-policy' })).resolves.toEqual(page);
    expect(mockCmsPageService.getPublishedBySlug).toHaveBeenCalledWith('reward-policy');
  });
});
