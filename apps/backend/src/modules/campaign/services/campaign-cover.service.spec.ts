import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { CampaignCoverService } from './campaign-cover.service';

describe('CampaignCoverService', () => {
  const campaignRepository = { findById: jest.fn(), update: jest.fn() };
  const storageService = { saveFile: jest.fn() };
  const service = new CampaignCoverService(campaignRepository as never, storageService as never);

  const picture = (overrides: Partial<Express.Multer.File> = {}) =>
    ({ originalname: 'cafe.jpg', mimetype: 'image/jpeg', size: 200_000, buffer: Buffer.from('jpeg bytes'), ...overrides }) as Express.Multer.File;

  beforeEach(() => {
    jest.resetAllMocks();
    campaignRepository.findById.mockResolvedValue({ id: 'campaign-1', status: 'DRAFT' });
    storageService.saveFile.mockResolvedValue({ path: '/campaign/3f2a.jpg' });
    campaignRepository.update.mockImplementation(async (id: string, data: object) => ({ id, ...data }));
  });

  describe('setCover', () => {
    it('saves the picture in the public campaign folder and uses it for the card and the banner', async () => {
      const result = await service.setCover('campaign-1', picture());

      expect(storageService.saveFile).toHaveBeenCalledWith(Buffer.from('jpeg bytes'), 'cafe.jpg', 'campaign', 'image/jpeg');
      expect(campaignRepository.update).toHaveBeenCalledWith('campaign-1', { thumbnailUrl: '/campaign/3f2a.jpg', bannerUrl: '/campaign/3f2a.jpg' });
      expect(result).toMatchObject({ thumbnailUrl: '/campaign/3f2a.jpg' });
    });

    it.each(['image/png', 'image/webp'])('accepts %s', async (mimetype) => {
      await expect(service.setCover('campaign-1', picture({ mimetype }))).resolves.toBeDefined();
    });

    it.each(['image/gif', 'application/pdf', 'image/svg+xml', 'text/html'])('refuses %s before saving anything', async (mimetype) => {
      await expect(service.setCover('campaign-1', picture({ mimetype }))).rejects.toThrow('must be a JPEG, PNG or WebP');
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('refuses a picture over 5 MB', async () => {
      await expect(service.setCover('campaign-1', picture({ size: 5 * 1024 * 1024 + 1 }))).rejects.toThrow('at most 5 MB');
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('asks for a picture when none was sent', async () => {
      await expect(service.setCover('campaign-1', undefined)).rejects.toThrow('Choose an image');
    });

    it.each(['PENDING_REVIEW', 'ACTIVE', 'COMPLETED'])('refuses to change the cover of a %s campaign', async (status) => {
      campaignRepository.findById.mockResolvedValue({ id: 'campaign-1', status });

      await expect(service.setCover('campaign-1', picture())).rejects.toThrow(BadRequestException);
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('allows it while changes are requested', async () => {
      campaignRepository.findById.mockResolvedValue({ id: 'campaign-1', status: 'CHANGES_REQUESTED' });
      await expect(service.setCover('campaign-1', picture())).resolves.toBeDefined();
    });

    it('reports a missing campaign', async () => {
      campaignRepository.findById.mockResolvedValue(null);
      await expect(service.setCover('missing', picture())).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCover', () => {
    it('clears the card picture and the banner', async () => {
      await service.removeCover('campaign-1');
      expect(campaignRepository.update).toHaveBeenCalledWith('campaign-1', { thumbnailUrl: null, bannerUrl: null });
    });

    it('refuses for a live campaign', async () => {
      campaignRepository.findById.mockResolvedValue({ id: 'campaign-1', status: 'ACTIVE' });
      await expect(service.removeCover('campaign-1')).rejects.toThrow(BadRequestException);
      expect(campaignRepository.update).not.toHaveBeenCalled();
    });
  });
});
