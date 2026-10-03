import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SavedCampaignRepository } from './saved-campaign.repository';

describe('SavedCampaignRepository', () => {
  let repository: SavedCampaignRepository;

  const mockPrisma = {
    savedCampaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavedCampaignRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<SavedCampaignRepository>(SavedCampaignRepository);
    jest.clearAllMocks();
  });

  it("lists a person's saved campaign ids, newest first", async () => {
    mockPrisma.savedCampaign.findMany.mockResolvedValue([{ campaignId: 'c-2' }, { campaignId: 'c-1' }]);

    await expect(repository.findIdsByUser('user-1')).resolves.toEqual(['c-2', 'c-1']);
    expect(mockPrisma.savedCampaign.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: { campaignId: true },
    });
  });

  it('says whether one campaign is saved', async () => {
    mockPrisma.savedCampaign.findUnique.mockResolvedValueOnce({ id: 's-1' }).mockResolvedValueOnce(null);

    await expect(repository.exists('user-1', 'c-1')).resolves.toBe(true);
    await expect(repository.exists('user-1', 'c-2')).resolves.toBe(false);
  });

  it('saves several at once, skipping duplicates and keeping the given order newest first', async () => {
    await repository.saveMany('user-1', ['c-new', 'c-old']);

    const { data, skipDuplicates } = mockPrisma.savedCampaign.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data.map((row: { campaignId: string }) => row.campaignId)).toEqual(['c-new', 'c-old']);
    expect(data[0].createdAt.getTime()).toBeGreaterThan(data[1].createdAt.getTime());
  });

  it('writes nothing for an empty list', async () => {
    await repository.saveMany('user-1', []);

    expect(mockPrisma.savedCampaign.createMany).not.toHaveBeenCalled();
  });

  it('removes only that person’s bookmark', async () => {
    await repository.remove('user-1', 'c-1');

    expect(mockPrisma.savedCampaign.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', campaignId: 'c-1' } });
  });
});
