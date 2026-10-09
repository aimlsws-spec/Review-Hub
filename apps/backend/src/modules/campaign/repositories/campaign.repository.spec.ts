import { Test, TestingModule } from '@nestjs/testing';

import { CampaignSort } from '@common/enums';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { CampaignRepository } from './campaign.repository';

describe('CampaignRepository', () => {
  /** "No end date, or one still ahead": the rule every public query applies. */
  const notEnded = { OR: [{ endAt: null }, { endAt: { gt: expect.any(Date) } }] };

  let repository: CampaignRepository;

  const mockPrisma = {
    campaign: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
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
        include: { tasks: { where: { deletedAt: null }, orderBy: { taskOrder: 'asc' } }, media: true, targets: true },
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

  describe('findForAdmin', () => {
    beforeEach(() => {
      mockPrisma.campaign.findMany.mockResolvedValue([{ id: 'campaign-1', merchant: { id: 'merchant-1', businessName: 'Sunrise Bakery' } }]);
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.campaign.groupBy.mockResolvedValue([
        { status: 'ACTIVE', _count: { _all: 3 } },
        { status: 'PENDING_REVIEW', _count: { _all: 1 } },
      ]);
    });

    it('lists campaigns in every status, newest first, with the business that runs each', async () => {
      const result = await repository.findForAdmin({ page: 2, limit: 10 });

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { merchant: { select: { id: true, businessName: true } } },
      });
      expect(result).toMatchObject({ total: 1, page: 2, limit: 10, statusCounts: { ACTIVE: 3, PENDING_REVIEW: 1 } });
    });

    it('filters by status, type, merchant and a search over title and business name', async () => {
      await repository.findForAdmin({ page: 1, limit: 20, status: 'ACTIVE', campaignType: 'REVIEW', merchantId: 'merchant-1', search: 'cake' });

      const base = {
        deletedAt: null,
        campaignType: 'REVIEW',
        merchantId: 'merchant-1',
        OR: [{ title: { contains: 'cake' } }, { merchant: { businessName: { contains: 'cake' } } }],
      };
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ...base, status: 'ACTIVE' } }));
      expect(mockPrisma.campaign.count).toHaveBeenCalledWith({ where: { ...base, status: 'ACTIVE' } });
      // The tab counts use every filter but the status, so each tab shows what choosing it would list.
      expect(mockPrisma.campaign.groupBy).toHaveBeenCalledWith({ by: ['status'], where: base, _count: { _all: true } });
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
          where: { deletedAt: null, status: 'ACTIVE', visibility: 'PUBLIC', AND: [notEnded] },
        }),
      );
    });

    it('leaves out a campaign past its end date, before the schedule job has marked it expired', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      mockPrisma.campaign.count.mockResolvedValue(0);

      await repository.findPublic({ page: 1, limit: 20 });

      const [condition] = mockPrisma.campaign.findMany.mock.calls.at(-1)[0].where.AND;
      expect(condition.OR[0]).toEqual({ endAt: null });
      expect(condition.OR[1].endAt.gt.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    describe('sorting', () => {
      const orderFor = async (sort?: CampaignSort) => {
        mockPrisma.campaign.findMany.mockResolvedValue([]);
        mockPrisma.campaign.count.mockResolvedValue(0);
        await repository.findPublic({ page: 1, limit: 20, sort });
        return mockPrisma.campaign.findMany.mock.calls.at(-1)[0];
      };

      it('puts featured campaigns first by default, then the newest', async () => {
        expect((await orderFor()).orderBy).toEqual([{ featured: 'desc' }, { createdAt: 'desc' }]);
        expect((await orderFor(CampaignSort.Featured)).orderBy).toEqual([{ featured: 'desc' }, { createdAt: 'desc' }]);
      });

      it('ranks the popular by how many people joined', async () => {
        expect((await orderFor(CampaignSort.Popular)).orderBy[0]).toEqual({ analytics: { joins: 'desc' } });
      });

      it('lists the newest first', async () => {
        expect((await orderFor(CampaignSort.Newest)).orderBy).toEqual([{ createdAt: 'desc' }]);
      });

      it('lists the biggest reward first, and keeps equal rewards in a steady order', async () => {
        expect((await orderFor(CampaignSort.HighestReward)).orderBy).toEqual([
          { rewardAmount: 'desc' },
          { featured: 'desc' },
          { createdAt: 'desc' },
        ]);
      });

      it('lists what ends soonest first, and only campaigns that have an end date (ended ones are always left out)', async () => {
        const args = await orderFor(CampaignSort.EndingSoon);

        expect(args.orderBy[0]).toEqual({ endAt: 'asc' });
        expect(args.where.endAt).toEqual({ not: null });
        expect(args.where.AND).toEqual([notEnded]);
      });

      it('does not filter by end date for the other sorts', async () => {
        for (const sort of [undefined, CampaignSort.Featured, CampaignSort.Popular, CampaignSort.Newest, CampaignSort.HighestReward]) {
          expect((await orderFor(sort)).where).not.toHaveProperty('endAt');
        }
      });

      it('still applies the type and search filters with any sort', async () => {
        mockPrisma.campaign.findMany.mockResolvedValue([]);
        mockPrisma.campaign.count.mockResolvedValue(0);

        await repository.findPublic({ page: 2, limit: 10, campaignType: 'REVIEW', search: 'cafe', sort: CampaignSort.Newest });

        const args = mockPrisma.campaign.findMany.mock.calls.at(-1)[0];
        expect(args.where).toMatchObject({ campaignType: 'REVIEW', OR: [{ title: { contains: 'cafe' } }, { shortDescription: { contains: 'cafe' } }] });
        expect(args).toMatchObject({ skip: 10, take: 10 });
      });

      describe('nearest', () => {
        // Bangalore. `near` is a couple of km away; `far` is on the other side of the country.
        const near = { id: 'near', merchant: { latitude: 12.98, longitude: 77.6 } };
        const far = { id: 'far', merchant: { latitude: 28.7041, longitude: 77.1025 } };
        const noLocation = { id: 'no-location', merchant: { latitude: null, longitude: null } };

        it('falls back to the default order when latitude/longitude are missing', async () => {
          mockPrisma.campaign.findMany.mockResolvedValue([]);
          mockPrisma.campaign.count.mockResolvedValue(0);

          await repository.findPublic({ page: 1, limit: 20, sort: CampaignSort.Nearest });

          const args = mockPrisma.campaign.findMany.mock.calls.at(-1)[0];
          expect(args.orderBy).toEqual([{ featured: 'desc' }, { createdAt: 'desc' }]);
        });

        it('sorts closest first and puts merchants with no location last', async () => {
          mockPrisma.campaign.findMany.mockResolvedValue([far, noLocation, near]);
          mockPrisma.campaign.count.mockResolvedValue(3);

          const result = await repository.findPublic({ page: 1, limit: 20, sort: CampaignSort.Nearest, latitude: 12.9716, longitude: 77.5946 });

          expect(result.data.map((c: { id: string }) => c.id)).toEqual(['near', 'far', 'no-location']);
        });

        it('never returns the merchant relation itself, only distance', async () => {
          mockPrisma.campaign.findMany.mockResolvedValue([near]);
          mockPrisma.campaign.count.mockResolvedValue(1);

          const result = await repository.findPublic({ page: 1, limit: 20, sort: CampaignSort.Nearest, latitude: 12.9716, longitude: 77.5946 });

          expect(result.data[0]).not.toHaveProperty('merchant');
          expect(result.data[0]).toHaveProperty('distanceMeters');
        });

        it('paginates over the candidate batch and caps total to it', async () => {
          mockPrisma.campaign.findMany.mockResolvedValue([near, far, noLocation]);
          mockPrisma.campaign.count.mockResolvedValue(3);

          const result = await repository.findPublic({ page: 2, limit: 1, sort: CampaignSort.Nearest, latitude: 12.9716, longitude: 77.5946 });

          expect(result.data.map((c: { id: string }) => c.id)).toEqual(['far']);
          expect(result.total).toBe(3);
        });
      });
    });
  });

  describe('findPublicById', () => {
    it('only finds an active, public, non-deleted campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'campaign-1' });

      await expect(repository.findPublicById('campaign-1')).resolves.toEqual({ id: 'campaign-1' });

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', deletedAt: null, status: 'ACTIVE', visibility: 'PUBLIC', AND: [notEnded] },
      });
    });
  });
});
