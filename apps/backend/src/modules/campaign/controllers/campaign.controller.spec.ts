import { Test, TestingModule } from '@nestjs/testing';

import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { CampaignOwnershipGuard } from '../guards';
import { CampaignRepository } from '../repositories';
import { CampaignCoverService, CampaignService } from '../services';

import { CampaignController } from './campaign.controller';

describe('CampaignController', () => {
  let controller: CampaignController;

  const mockCampaignService = {
    getById: jest.fn(),
    getForOwner: jest.fn(),
    update: jest.fn(),
    submitForApproval: jest.fn(),
    activate: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    remove: jest.fn(),
  };
  const mockCoverService = { setCover: jest.fn(), removeCover: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: CampaignCoverService, useValue: mockCoverService },
        CampaignOwnershipGuard,
        { provide: CampaignRepository, useValue: {} },
        { provide: MerchantRepository, useValue: {} },
        { provide: MerchantTeamRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<CampaignController>(CampaignController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOne', () => {
    it('should call campaignService.getForOwner', async () => {
      await controller.getOne('campaign-1');
      expect(mockCampaignService.getForOwner).toHaveBeenCalledWith('campaign-1');
    });
  });

  describe('cover image', () => {
    it('passes the uploaded picture to the cover service', async () => {
      const file = { originalname: 'cover.jpg', mimetype: 'image/jpeg' } as Express.Multer.File;
      await controller.setCover('campaign-1', file);
      expect(mockCoverService.setCover).toHaveBeenCalledWith('campaign-1', file);
    });

    it('removes the cover', async () => {
      await controller.removeCover('campaign-1');
      expect(mockCoverService.removeCover).toHaveBeenCalledWith('campaign-1');
    });
  });

  describe('update', () => {
    it('should call campaignService.update', async () => {
      const dto = { title: 'Updated title' };
      await controller.update('campaign-1', 'user-1', dto as never);
      expect(mockCampaignService.update).toHaveBeenCalledWith('campaign-1', 'user-1', dto);
    });
  });

  describe('submit', () => {
    it('should call campaignService.submitForApproval', async () => {
      await controller.submit('campaign-1');
      expect(mockCampaignService.submitForApproval).toHaveBeenCalledWith('campaign-1');
    });
  });

  describe('activate / pause / resume / cancel', () => {
    it('should delegate each action to the matching service method', async () => {
      await controller.activate('campaign-1');
      expect(mockCampaignService.activate).toHaveBeenCalledWith('campaign-1');

      await controller.pause('campaign-1');
      expect(mockCampaignService.pause).toHaveBeenCalledWith('campaign-1');

      await controller.resume('campaign-1');
      expect(mockCampaignService.resume).toHaveBeenCalledWith('campaign-1');

      await controller.cancel('campaign-1');
      expect(mockCampaignService.cancel).toHaveBeenCalledWith('campaign-1');
    });
  });

  describe('remove', () => {
    it('should call campaignService.remove', async () => {
      await controller.remove('campaign-1');
      expect(mockCampaignService.remove).toHaveBeenCalledWith('campaign-1');
    });
  });
});
