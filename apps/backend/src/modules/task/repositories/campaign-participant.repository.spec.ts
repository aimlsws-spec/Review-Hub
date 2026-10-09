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
      findMany: jest.fn(),
      count: jest.fn(),
    },
    reward: { groupBy: jest.fn() },
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

  describe('findForUser', () => {
    it("lists one person's participations in the given statuses, leaving out deleted campaigns", async () => {
      mockPrisma.campaignParticipant.findMany.mockResolvedValue([{ status: 'COMPLETED' }]);
      mockPrisma.campaignParticipant.count.mockResolvedValue(1);

      const result = await repository.findForUser({ userId: 'user-1', statuses: ['COMPLETED', 'REWARDED'], page: 2, limit: 10 });

      const where = { userId: 'user-1', deletedAt: null, status: { in: ['COMPLETED', 'REWARDED'] }, campaign: { deletedAt: null } };
      expect(mockPrisma.campaignParticipant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 10, take: 10, orderBy: { updatedAt: 'desc' } }));
      expect(mockPrisma.campaignParticipant.count).toHaveBeenCalledWith({ where });
      expect(result).toMatchObject({ total: 1, page: 2, limit: 10 });
    });
  });

  describe('sumCreditedRewards', () => {
    it('sums only credited rewards, per campaign', async () => {
      mockPrisma.reward.groupBy.mockResolvedValue([{ campaignId: 'campaign-1', _sum: { amount: 30 } }]);

      const result = await repository.sumCreditedRewards('user-1', ['campaign-1', 'campaign-2']);

      expect(mockPrisma.reward.groupBy).toHaveBeenCalledWith({
        by: ['campaignId'],
        where: { userId: 'user-1', campaignId: { in: ['campaign-1', 'campaign-2'] }, status: 'CREDITED', deletedAt: null },
        _sum: { amount: true },
      });
      expect(result.get('campaign-1')).toBe(30);
      expect(result.has('campaign-2')).toBe(false);
    });

    it('asks nothing for an empty list', async () => {
      expect((await repository.sumCreditedRewards('user-1', [])).size).toBe(0);
      expect(mockPrisma.reward.groupBy).not.toHaveBeenCalled();
    });
  });
});
