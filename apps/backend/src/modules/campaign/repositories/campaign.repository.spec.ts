import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CampaignRepository } from './campaign.repository';

describe('CampaignRepository', () => {
  let repository: CampaignRepository;

  const mockPrisma = {
    campaign: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    campaignApproval: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CampaignRepository>(CampaignRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should call prisma with correct args', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'campaign-1' });

      const result = await repository.findById('campaign-1');
      expect(result).toEqual({ id: 'campaign-1' });
      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', deletedAt: null },
        include: { tasks: true, media: true, targets: true },
      });
    });
  });

  describe('findBySlug', () => {
    it('should find campaign by slug', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'campaign-1', slug: 'my-campaign-abc123' });

      const result = await repository.findBySlug('my-campaign-abc123');
      expect(result).toHaveProperty('slug', 'my-campaign-abc123');
    });
  });

  describe('create', () => {
    it('should create a campaign', async () => {
      const data = { title: 'Try our menu', slug: 'try-our-menu-abc123' };
      mockPrisma.campaign.create.mockResolvedValue({ id: 'new-id', ...data });

      const result = await repository.create(data as never);
      expect(result).toHaveProperty('id', 'new-id');
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      mockPrisma.campaign.update.mockResolvedValue({ id: 'campaign-1', deletedAt: new Date() });

      await repository.softDelete('campaign-1');
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('findByMerchant', () => {
    it('should return paginated results scoped to a merchant', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([{ id: 'campaign-1' }]);
      mockPrisma.campaign.count.mockResolvedValue(1);

      const result = await repository.findByMerchant({ merchantId: 'merchant-1', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantId: 'merchant-1', deletedAt: null },
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.campaign.count.mockResolvedValue(0);

      await repository.findByMerchant({ merchantId: 'merchant-1', page: 1, limit: 20, status: 'ACTIVE' });
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  describe('createApproval', () => {
    it('should create a CampaignApproval row', async () => {
      mockPrisma.campaignApproval.create.mockResolvedValue({ id: 'approval-1' });

      const data = { status: 'APPROVED' };
      const result = await repository.createApproval(data as never);
      expect(result).toHaveProperty('id', 'approval-1');
      expect(mockPrisma.campaignApproval.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findPendingReview', () => {
    it('should only return PENDING_REVIEW, non-deleted campaigns, oldest first', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([{ id: 'campaign-1' }]);
      mockPrisma.campaign.count.mockResolvedValue(1);

      const result = await repository.findPendingReview({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING_REVIEW', deletedAt: null },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('findPublic', () => {
    it('should only return active, public, non-deleted campaigns', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([{ id: 'campaign-1' }]);
      mockPrisma.campaign.count.mockResolvedValue(1);

      const result = await repository.findPublic({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, status: 'ACTIVE', visibility: 'PUBLIC' },
        }),
      );
    });
  });
});
