import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CampaignParticipantRepository } from './campaign-participant.repository';

describe('CampaignParticipantRepository', () => {
  let repository: CampaignParticipantRepository;

  const mockPrisma = {
    campaignParticipant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignParticipantRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CampaignParticipantRepository>(CampaignParticipantRepository);
    jest.clearAllMocks();
  });

  describe('findByCampaignAndUser', () => {
    it('should query the compound unique key', async () => {
      mockPrisma.campaignParticipant.findUnique.mockResolvedValue({ id: 'participant-1' });

      const result = await repository.findByCampaignAndUser('campaign-1', 'user-1');
      expect(result).toEqual({ id: 'participant-1' });
      expect(mockPrisma.campaignParticipant.findUnique).toHaveBeenCalledWith({
        where: { campaignId_userId: { campaignId: 'campaign-1', userId: 'user-1' } },
      });
    });
  });

  describe('create', () => {
    it('should create a participant', async () => {
      mockPrisma.campaignParticipant.create.mockResolvedValue({ id: 'participant-1' });

      const result = await repository.create({} as never);
      expect(result).toHaveProperty('id', 'participant-1');
    });
  });
});
