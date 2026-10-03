import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { CampaignRepository, SavedCampaignRepository } from '../repositories';

import { SavedCampaignService } from './saved-campaign.service';

describe('SavedCampaignService', () => {
  let service: SavedCampaignService;

  const mockSavedRepository = {
    findIdsByUser: jest.fn(),
    countByUser: jest.fn(),
    exists: jest.fn(),
    saveMany: jest.fn(),
    remove: jest.fn(),
  };
  const mockCampaignRepository = { findPublicById: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedCampaignService,
        { provide: SavedCampaignRepository, useValue: mockSavedRepository },
        { provide: CampaignRepository, useValue: mockCampaignRepository },
      ],
    }).compile();

    service = module.get<SavedCampaignService>(SavedCampaignService);
    jest.clearAllMocks();
    mockSavedRepository.findIdsByUser.mockResolvedValue(['c-1']);
    mockCampaignRepository.findPublicById.mockResolvedValue({ id: 'c-1' });
  });

  describe('save', () => {
    it('saves a visible campaign and returns the whole list', async () => {
      mockSavedRepository.exists.mockResolvedValue(false);
      mockSavedRepository.countByUser.mockResolvedValue(3);

      await expect(service.save('user-1', 'c-1')).resolves.toEqual({ campaignIds: ['c-1'] });
      expect(mockSavedRepository.saveMany).toHaveBeenCalledWith('user-1', ['c-1']);
    });

    it('changes nothing when the campaign is already saved, even if the list is full', async () => {
      mockSavedRepository.exists.mockResolvedValue(true);
      mockSavedRepository.countByUser.mockResolvedValue(30);

      await service.save('user-1', 'c-1');

      expect(mockSavedRepository.saveMany).not.toHaveBeenCalled();
    });

    it('refuses a campaign people can not see (ended, private or unknown)', async () => {
      mockSavedRepository.exists.mockResolvedValue(false);
      mockCampaignRepository.findPublicById.mockResolvedValue(null);

      await expect(service.save('user-1', 'c-9')).rejects.toThrow(NotFoundException);
      expect(mockSavedRepository.saveMany).not.toHaveBeenCalled();
    });

    it('refuses once 30 are saved', async () => {
      mockSavedRepository.exists.mockResolvedValue(false);
      mockSavedRepository.countByUser.mockResolvedValue(30);

      await expect(service.save('user-1', 'c-2')).rejects.toThrow(BadRequestException);
      expect(mockSavedRepository.saveMany).not.toHaveBeenCalled();
    });
  });

  it('removes a campaign and returns what is left', async () => {
    mockSavedRepository.findIdsByUser.mockResolvedValue([]);

    await expect(service.remove('user-1', 'c-1')).resolves.toEqual({ campaignIds: [] });
    expect(mockSavedRepository.remove).toHaveBeenCalledWith('user-1', 'c-1');
  });

  describe('import', () => {
    it('adds the visible ones not already saved, in order, and skips the rest', async () => {
      mockSavedRepository.findIdsByUser.mockResolvedValueOnce(['c-saved']).mockResolvedValueOnce(['c-a', 'c-b', 'c-saved']);
      mockCampaignRepository.findPublicById.mockImplementation(async (id: string) => (id === 'c-gone' ? null : { id }));

      const result = await service.import('user-1', ['c-a', 'c-gone', 'c-saved', 'c-b', 'c-a']);

      expect(mockSavedRepository.saveMany).toHaveBeenCalledWith('user-1', ['c-a', 'c-b']);
      expect(result).toEqual({ campaignIds: ['c-a', 'c-b', 'c-saved'] });
    });

    it('never grows the list past 30: the newest ones win', async () => {
      const saved = Array.from({ length: 29 }, (_, i) => `c-${i}`);
      mockSavedRepository.findIdsByUser.mockResolvedValue(saved);

      await service.import('user-1', ['c-new-1', 'c-new-2']);

      expect(mockSavedRepository.saveMany).toHaveBeenCalledWith('user-1', ['c-new-1']);
    });
  });
});
