import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { CampaignSort } from '@common/enums';
import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MerchantWalletRepository } from '../../merchant/repositories';
import { CampaignBudgetNotCoveredException } from '../exceptions/budget-not-covered.exception';
import { CampaignPolicyViolationException } from '../exceptions/policy-violation.exception';
import { CampaignRepository } from '../repositories';

import { CampaignPolicyService } from './campaign-policy.service';
import { CampaignService } from './campaign.service';

describe('CampaignService', () => {
  let service: CampaignService;

  const mockCampaignRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findForDuplication: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findByMerchant: jest.fn(),
    findPublic: jest.fn(),
    findPublicById: jest.fn(),
    createApproval: jest.fn(),
    findPendingReview: jest.fn(),
    findForAdminReview: jest.fn(),
  };

  const mockMerchantWalletRepository = {
    findByMerchantId: jest.fn(),
    reserveCampaignBudget: jest.fn(),
    spendCampaignBudget: jest.fn(),
    releaseCampaignBudget: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAuditLogService = {
    record: jest.fn(),
  };

  const mockPolicyService = {
    assertCampaignAllowed: jest.fn(),
    findingsForCampaigns: jest.fn(),
  };

  const violation = new CampaignPolicyViolationException('submitted', [
    { rule: 'REQUIRES_RATING', severity: 'BLOCK', field: 'title', excerpt: '5 stars', message: 'No rating may be asked for.' } as never,
  ]);

  const draftCampaign = {
    id: 'campaign-1',
    merchantId: 'merchant-1',
    title: 'Try our menu',
    campaignType: 'REVIEW',
    status: 'DRAFT',
    autoApprove: false,
    totalBudget: 5000,
    spentBudget: 0,
    startAt: null,
    endAt: null,
    tasks: [{ id: 'task-1' }],
  };

  const DAY = 24 * 60 * 60 * 1000;
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() }, userGamificationProfile: { findUnique: jest.fn() } },
        },
        { provide: CampaignRepository, useValue: mockCampaignRepository },
        { provide: MerchantWalletRepository, useValue: mockMerchantWalletRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: CampaignPolicyService, useValue: mockPolicyService },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    jest.resetAllMocks();
    mockPolicyService.assertCampaignAllowed.mockResolvedValue(undefined);
    mockPolicyService.findingsForCampaigns.mockResolvedValue(new Map());
    // Enough to cover any campaign here, unless a test says otherwise.
    mockMerchantWalletRepository.findByMerchantId.mockResolvedValue({ availableBalance: 100000 });
  });

  describe('create', () => {
    it('should create a campaign in DRAFT status with a unique slug', async () => {
      mockCampaignRepository.findBySlug.mockResolvedValue(null);
      mockCampaignRepository.create.mockResolvedValue({ id: 'campaign-1' });
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);

      const dto = { title: 'Try our menu', description: 'Come visit and tell us what you think', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: 5000 };
      const result = await service.create('merchant-1', 'user-1', dto as never);

      expect(result).toEqual(draftCampaign);
      expect(mockCampaignRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { connect: { id: 'merchant-1' } },
          status: 'DRAFT',
          createdBy: 'user-1',
          remainingBudget: 5000,
          rewardType: 'CASH',
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('campaign.created', expect.any(Object));
    });
  });

  describe('duplicate', () => {
    const original = {
      ...draftCampaign,
      id: 'campaign-1',
      merchantId: 'merchant-1',
      title: 'Summer menu',
      status: 'COMPLETED',
      totalBudget: 5000,
      reservedBudget: 5000,
      spentBudget: 4200,
      currentParticipants: 84,
      startAt: new Date('2026-06-01'),
      endAt: new Date('2026-06-30'),
      approvedAt: new Date('2026-05-30'),
      featured: true,
      targetCountries: null,
      targetStates: ['GJ'],
      targetCities: null,
      metadata: { somethingInternal: true },
      tasks: [{ title: 'Scan at the counter', taskType: 'QR_SCAN', taskOrder: 0, configuration: { qrCode: 'STORE-42' } }],
      media: [{ type: 'IMAGE', url: '/uploads/campaigns/a.jpg', thumbnail: null, displayOrder: 0, metadata: null }],
      targets: [{ countryId: null, stateId: 'state-gj', cityId: null, minimumAge: 18, maximumAge: null, minimumFollowers: 0, minimumLevel: 0, gender: 'ALL' }],
      categories: [{ categoryId: 'cat-food' }],
      tags: [{ tagId: 'tag-summer' }],
    };

    beforeEach(() => {
      mockCampaignRepository.findForDuplication.mockResolvedValue(original);
      mockCampaignRepository.findBySlug.mockResolvedValue(null);
      mockCampaignRepository.create.mockResolvedValue({ id: 'campaign-2', title: 'Summer menu (copy)' });
      mockCampaignRepository.findById.mockResolvedValue({ id: 'campaign-2', status: 'DRAFT' });
    });

    it('creates a fresh DRAFT that copies the setup but none of what happened to the original', async () => {
      await service.duplicate('campaign-1', 'user-1');

      const data = mockCampaignRepository.create.mock.calls[0][0];
      expect(data).toMatchObject({
        merchant: { connect: { id: 'merchant-1' } },
        title: 'Summer menu (copy)',
        status: 'DRAFT',
        totalBudget: 5000,
        remainingBudget: 5000,
        targetStates: ['GJ'],
        createdBy: 'user-1',
        metadata: { duplicatedFromCampaignId: 'campaign-1' },
      });
      expect(data.slug).toMatch(/^summer-menu-copy-[0-9a-f]{6}$/);
      // Budget use, participants, approval, featuring and dates stay with the original.
      for (const field of ['reservedBudget', 'spentBudget', 'currentParticipants', 'approvedAt', 'publishedAt', 'featured', 'startAt', 'endAt']) {
        expect(data).not.toHaveProperty(field);
      }
      // A null JSON column is left out rather than passed as null, which Prisma would reject.
      expect(data.targetCountries).toBeUndefined();
    });

    it('makes the copy a cash campaign even when the original carries an old non-cash label', async () => {
      mockCampaignRepository.findForDuplication.mockResolvedValueOnce({ ...original, rewardType: 'COUPON' });

      await service.duplicate('campaign-1', 'user-1');

      expect(mockCampaignRepository.create.mock.calls[0][0]).toMatchObject({ rewardType: 'CASH' });
    });

    it('copies tasks (QR code included), media, targets, categories and tags', async () => {
      await service.duplicate('campaign-1', 'user-1');

      const data = mockCampaignRepository.create.mock.calls[0][0];
      expect(data.tasks.create).toEqual([expect.objectContaining({ taskType: 'QR_SCAN', configuration: { qrCode: 'STORE-42' } })]);
      expect(data.media.create).toEqual([expect.objectContaining({ url: '/uploads/campaigns/a.jpg' })]);
      expect(data.targets.create).toEqual([expect.objectContaining({ stateId: 'state-gj', minimumAge: 18 })]);
      expect(data.categories.create).toEqual([{ category: { connect: { id: 'cat-food' } } }]);
      expect(data.tags.create).toEqual([{ tag: { connect: { id: 'tag-summer' } } }]);
    });

    it('announces and audits the new campaign', async () => {
      await service.duplicate('campaign-1', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('campaign.created', expect.objectContaining({ campaignId: 'campaign-2' }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'campaign-2', action: 'CREATE', after: { duplicatedFromCampaignId: 'campaign-1' } }),
      );
    });

    it('refuses a campaign that does not exist or was deleted', async () => {
      mockCampaignRepository.findForDuplication.mockResolvedValue(null);
      await expect(service.duplicate('missing', 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockCampaignRepository.create).not.toHaveBeenCalled();
    });

    it('refuses to copy a campaign of a kind that can not be created at the moment', async () => {
      mockCampaignRepository.findForDuplication.mockResolvedValue({ ...original, campaignType: 'SURVEY' });

      await expect(service.duplicate('campaign-1', 'user-1')).rejects.toThrow('SURVEY campaigns can not be created at the moment');
      expect(mockCampaignRepository.create).not.toHaveBeenCalled();
    });

    it('refuses to copy a campaign with a task of a kind that can not be added at the moment', async () => {
      mockCampaignRepository.findForDuplication.mockResolvedValue({
        ...original,
        tasks: [...original.tasks, { title: 'Install our app', taskType: 'APP_INSTALL', taskOrder: 1, configuration: null }],
      });

      await expect(service.duplicate('campaign-1', 'user-1')).rejects.toThrow('a task of a kind that can not be added');
      expect(mockCampaignRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);

      const result = await service.getById('campaign-1');
      expect(result).toEqual(draftCampaign);
    });

    it('should throw NotFoundException for unknown campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(null);

      await expect(service.getById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicById', () => {
    it('returns an active, public campaign', async () => {
      mockCampaignRepository.findPublicById.mockResolvedValue({ id: 'campaign-1', title: 'Cafe' });

      await expect(service.getPublicById('campaign-1')).resolves.toEqual({ id: 'campaign-1', title: 'Cafe' });
    });

    it('says not found for anything else: a draft, an ended or private campaign, or one that does not exist look the same', async () => {
      mockCampaignRepository.findPublicById.mockResolvedValue(null);

      await expect(service.getPublicById('campaign-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listPublic', () => {
    it('rejects sort=nearest without a location', async () => {
      await expect(service.listPublic({ page: 1, limit: 20, sort: CampaignSort.Nearest } as never)).rejects.toThrow(BadRequestException);
      expect(mockCampaignRepository.findPublic).not.toHaveBeenCalled();
    });

    it('passes latitude/longitude through for sort=nearest', async () => {
      mockCampaignRepository.findPublic.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listPublic({ page: 1, limit: 20, sort: CampaignSort.Nearest, latitude: 12.9716, longitude: 77.5946 } as never);

      expect(mockCampaignRepository.findPublic).toHaveBeenCalledWith(
        expect.objectContaining({ sort: CampaignSort.Nearest, latitude: 12.9716, longitude: 77.5946 }),
      );
    });

    it('does not require a location for other sorts', async () => {
      mockCampaignRepository.findPublic.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await expect(service.listPublic({ page: 1, limit: 20, sort: CampaignSort.Newest } as never)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('should update a DRAFT campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, title: 'Updated title' });

      const result = await service.update('campaign-1', 'user-1', { title: 'Updated title' });
      expect(result).toHaveProperty('title', 'Updated title');
    });

    it('should reject edits to a non-editable campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      await expect(service.update('campaign-1', 'user-1', { title: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('sets the dates, and clears one that is sent as null', async () => {
      const start = daysFromNow(1).toISOString();
      const end = daysFromNow(10).toISOString();
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, endAt: daysFromNow(5) });

      await service.update('campaign-1', 'user-1', { startAt: start, endAt: end });
      expect(mockCampaignRepository.update).toHaveBeenLastCalledWith(
        'campaign-1',
        expect.objectContaining({ startAt: new Date(start), endAt: new Date(end) }),
      );

      await service.update('campaign-1', 'user-1', { endAt: null as never });
      expect(mockCampaignRepository.update).toHaveBeenLastCalledWith('campaign-1', expect.objectContaining({ endAt: null }));
    });

    it('keeps the stored value of a column that always has one when an edit sends null, but clears the participant cap', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);

      await service.update('campaign-1', 'user-1', { minimumFollowers: null, maxParticipants: null } as never);

      const data = mockCampaignRepository.update.mock.calls[0][1];
      expect(data).not.toHaveProperty('minimumFollowers');
      expect(data.maxParticipants).toBeNull();
    });

    it('checks a new start date against the end date already saved', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, endAt: daysFromNow(5) });

      await expect(service.update('campaign-1', 'user-1', { startAt: daysFromNow(6).toISOString() })).rejects.toThrow(
        'The end date must be after the start date',
      );
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('dates on create', () => {
    const dto = { title: 'Try our menu', description: 'Visit us and tell us honestly how it went.', campaignType: 'REVIEW', rewardAmount: 50, totalBudget: 500 };

    it('refuses an end date that has already passed', async () => {
      await expect(service.create('merchant-1', 'user-1', { ...dto, endAt: daysFromNow(-1).toISOString() } as never)).rejects.toThrow(
        'The end date must be in the future',
      );
      expect(mockCampaignRepository.create).not.toHaveBeenCalled();
    });

    it('treats null for a column that always has a value as not given, so its default applies', async () => {
      mockCampaignRepository.findBySlug.mockResolvedValue(null);
      mockCampaignRepository.create.mockResolvedValue({ id: 'campaign-1' });
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);

      await service.create('merchant-1', 'user-1', { ...dto, minimumFollowers: null, targetGender: null, maxParticipants: null } as never);

      const data = mockCampaignRepository.create.mock.calls[0][0];
      expect(data.minimumFollowers).toBeUndefined();
      expect(data.targetGender).toBeUndefined();
    });

    it('refuses an end date before the start date', async () => {
      await expect(
        service.create('merchant-1', 'user-1', { ...dto, startAt: daysFromNow(5).toISOString(), endAt: daysFromNow(2).toISOString() } as never),
      ).rejects.toThrow('The end date must be after the start date');
    });
  });

  describe('submitForApproval', () => {
    it('should move a DRAFT campaign to PENDING_REVIEW', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });

      const result = await service.submitForApproval('campaign-1');
      expect(result).toHaveProperty('status', 'PENDING_REVIEW');
      expect(mockCampaignRepository.update).toHaveBeenCalledWith('campaign-1', { status: 'PENDING_REVIEW' });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'campaign.submitted',
        expect.objectContaining({ campaignId: 'campaign-1', merchantId: draftCampaign.merchantId }),
      );
    });

    it('refuses a campaign whose online task has no link, naming the task', async () => {
      mockCampaignRepository.findById.mockResolvedValue({
        ...draftCampaign,
        tasks: [{ id: 'task-1', title: 'Follow us on Instagram', taskType: 'INSTAGRAM_FOLLOW', configuration: null }],
      });

      await expect(service.submitForApproval('campaign-1')).rejects.toThrow(
        'Task "Follow us on Instagram": Add the link to Instagram that participants open to do this task',
      );
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
    });

    it('submits a campaign whose online task has its link', async () => {
      mockCampaignRepository.findById.mockResolvedValue({
        ...draftCampaign,
        tasks: [
          {
            id: 'task-1',
            title: 'Follow us on Instagram',
            taskType: 'INSTAGRAM_FOLLOW',
            configuration: { targetUrl: 'https://www.instagram.com/prernatestcafe/' },
          },
        ],
      });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });

      await expect(service.submitForApproval('campaign-1')).resolves.toHaveProperty('status', 'PENDING_REVIEW');
    });

    it('still needs an admin when the merchant asked for auto-approval: a merchant can not approve their own campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, autoApprove: true });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });

      const result = await service.submitForApproval('campaign-1');

      expect(result).toHaveProperty('status', 'PENDING_REVIEW');
      const written = mockCampaignRepository.update.mock.calls[0][1];
      expect(written.status).toBe('PENDING_REVIEW');
      expect(written).not.toHaveProperty('approvedAt');
    });

    it('never records an approval time or an approver when submitting', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, autoApprove: true });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });

      await service.submitForApproval('campaign-1');

      expect(mockCampaignRepository.update.mock.calls[0][1]).not.toHaveProperty('approvedBy');
      expect(mockCampaignRepository.update.mock.calls[0][1]).not.toHaveProperty('approvedAt');
    });

    it('a campaign sent back for changes is reviewed again too', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'CHANGES_REQUESTED', autoApprove: true });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });

      await service.submitForApproval('campaign-1');

      expect(mockCampaignRepository.update).toHaveBeenCalledWith('campaign-1', { status: 'PENDING_REVIEW' });
    });

    it('refuses a campaign whose wording asks for a rating, and leaves it as it was', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockPolicyService.assertCampaignAllowed.mockRejectedValue(violation);

      await expect(service.submitForApproval('campaign-1')).rejects.toBe(violation);

      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('refuses a campaign with no tasks: there would be nothing to do once it is live', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, tasks: [] });

      await expect(service.submitForApproval('campaign-1')).rejects.toThrow('Add at least one task');
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
    });

    it("refuses a campaign the wallet can not pay for, saying what is there, what is needed and that nothing was taken", async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockMerchantWalletRepository.findByMerchantId.mockResolvedValue({ availableBalance: 1200.5 });

      const error = await service.submitForApproval('campaign-1').catch((e) => e);

      expect(error).toBeInstanceOf(CampaignBudgetNotCoveredException);
      expect(error.message).toContain('₹1,200.50 available');
      expect(error.message).toContain('₹5,000.00');
      expect(error.message).toContain('Add ₹3,799.50');
      expect(error.message).toContain('Nothing is taken from your wallet until the campaign is approved');
      expect(error.details).toEqual({ available: 1200.5, required: 5000, shortfall: 3799.5 });
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
      expect(mockMerchantWalletRepository.reserveCampaignBudget).not.toHaveBeenCalled();
    });

    it('treats a merchant with no wallet yet as having nothing in it', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockMerchantWalletRepository.findByMerchantId.mockResolvedValue(null);

      await expect(service.submitForApproval('campaign-1')).rejects.toThrow(CampaignBudgetNotCoveredException);
    });

    it('accepts a wallet that holds exactly the budget, and takes nothing from it', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockMerchantWalletRepository.findByMerchantId.mockResolvedValue({ availableBalance: '5000.00' });

      await service.submitForApproval('campaign-1');

      expect(mockCampaignRepository.update).toHaveBeenCalledWith('campaign-1', { status: 'PENDING_REVIEW' });
      expect(mockMerchantWalletRepository.reserveCampaignBudget).not.toHaveBeenCalled();
    });

    it('refuses a campaign whose end date has passed while it was a draft', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, endAt: daysFromNow(-1) });

      await expect(service.submitForApproval('campaign-1')).rejects.toThrow('The end date must be in the future');
    });

    it('should reject submitting a campaign that is not DRAFT/CHANGES_REQUESTED', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      await expect(service.submitForApproval('campaign-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('fundForMerchant', () => {
    it("activates the merchant's own campaign", async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'APPROVED' });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      await expect(service.fundForMerchant('merchant-1', 'campaign-1')).resolves.toHaveProperty('status', 'ACTIVE');
    });

    it("refuses another merchant's campaign as not found, and touches no wallet", async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'APPROVED' });

      await expect(service.fundForMerchant('merchant-2', 'campaign-1')).rejects.toThrow(NotFoundException);
      expect(mockMerchantWalletRepository.reserveCampaignBudget).not.toHaveBeenCalled();
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('status transitions', () => {
    it('should activate an APPROVED campaign and reserve its full budget from the merchant wallet', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'APPROVED' });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      const result = await service.activate('campaign-1');
      expect(result).toHaveProperty('status', 'ACTIVE');
      expect(mockMerchantWalletRepository.reserveCampaignBudget).toHaveBeenCalledWith({
        merchantId: 'merchant-1',
        campaignId: 'campaign-1',
        amount: 5000,
      });
    });

    it('schedules an approved campaign whose start date is ahead, reserving its budget now', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'APPROVED', startAt: daysFromNow(2) });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'SCHEDULED' });

      await expect(service.activate('campaign-1')).resolves.toHaveProperty('status', 'SCHEDULED');
      expect(mockCampaignRepository.update).toHaveBeenCalledWith('campaign-1', { status: 'SCHEDULED' });
      expect(mockMerchantWalletRepository.reserveCampaignBudget).toHaveBeenCalledWith(expect.objectContaining({ amount: 5000 }));
    });

    it('starts a scheduled campaign without reserving its budget a second time', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'SCHEDULED', startAt: daysFromNow(-0.01) });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      await expect(service.startScheduled('campaign-1')).resolves.toHaveProperty('status', 'ACTIVE');
      expect(mockCampaignRepository.update).toHaveBeenCalledWith('campaign-1', expect.objectContaining({ status: 'ACTIVE', publishedAt: expect.any(Date) }));
      expect(mockMerchantWalletRepository.reserveCampaignBudget).not.toHaveBeenCalled();
    });

    it('refuses to activate a campaign whose end date has passed, and touches no wallet', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'APPROVED', endAt: daysFromNow(-1) });

      await expect(service.activate('campaign-1')).rejects.toThrow('end date has passed');
      expect(mockMerchantWalletRepository.reserveCampaignBudget).not.toHaveBeenCalled();
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
    });

    it.each(['ACTIVE', 'PAUSED', 'SCHEDULED'])('expires a %s campaign and hands back the budget it did not spend', async (status) => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'EXPIRED' });

      await expect(service.expire('campaign-1')).resolves.toHaveProperty('status', 'EXPIRED');
      expect(mockMerchantWalletRepository.releaseCampaignBudget).toHaveBeenCalledWith({ merchantId: 'merchant-1', campaignId: 'campaign-1' });
    });

    it('should reject activating a DRAFT campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);

      await expect(service.activate('campaign-1')).rejects.toThrow(BadRequestException);
    });

    it('should surface an insufficient-balance rejection from the wallet and leave the campaign status unchanged', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'APPROVED' });
      mockMerchantWalletRepository.reserveCampaignBudget.mockRejectedValue(new BadRequestException('Insufficient wallet balance to activate this campaign'));

      await expect(service.activate('campaign-1')).rejects.toThrow(BadRequestException);
      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
    });

    it('should pause an ACTIVE campaign and resume it again without re-reserving the budget', async () => {
      mockCampaignRepository.findById.mockResolvedValueOnce({ ...draftCampaign, status: 'ACTIVE' });
      mockCampaignRepository.update.mockResolvedValueOnce({ ...draftCampaign, status: 'PAUSED' });
      await expect(service.pause('campaign-1')).resolves.toHaveProperty('status', 'PAUSED');

      mockCampaignRepository.findById.mockResolvedValueOnce({ ...draftCampaign, status: 'PAUSED' });
      mockCampaignRepository.update.mockResolvedValueOnce({ ...draftCampaign, status: 'ACTIVE' });
      await expect(service.resume('campaign-1')).resolves.toHaveProperty('status', 'ACTIVE');

      expect(mockMerchantWalletRepository.reserveCampaignBudget).not.toHaveBeenCalled();
    });

    it('lets the merchant withdraw a campaign that is waiting for review', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'CANCELLED' });

      await expect(service.cancel('campaign-1')).resolves.toHaveProperty('status', 'CANCELLED');
      expect(mockCampaignRepository.update).toHaveBeenCalledWith('campaign-1', { status: 'CANCELLED' });
    });

    it('should cancel a DRAFT campaign and release any reserved budget', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'CANCELLED' });

      const result = await service.cancel('campaign-1');
      expect(result).toHaveProperty('status', 'CANCELLED');
      expect(mockMerchantWalletRepository.releaseCampaignBudget).toHaveBeenCalledWith({
        merchantId: 'merchant-1',
        campaignId: 'campaign-1',
      });
    });
  });

  describe('approve', () => {
    it('should move a PENDING_REVIEW campaign to APPROVED, log the approval, and audit it', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'APPROVED' });

      const result = await service.approve('campaign-1', 'admin-1', { comments: 'Looks good' });

      expect(result).toHaveProperty('status', 'APPROVED');
      expect(mockCampaignRepository.createApproval).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED', comments: 'Looks good' }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', actorType: 'ADMIN', action: 'APPROVE', entity: 'Campaign' }),
      );
    });
  });

  describe('approve, wording re-check', () => {
    it('does not approve a campaign whose wording now asks for a rating', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });
      mockPolicyService.assertCampaignAllowed.mockRejectedValue(violation);

      await expect(service.approve('campaign-1', 'admin-1', { comments: 'ok' })).rejects.toBe(violation);

      expect(mockCampaignRepository.update).not.toHaveBeenCalled();
      expect(mockCampaignRepository.createApproval).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should move a PENDING_REVIEW campaign to REJECTED, log the rejection, and audit it', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'REJECTED' });

      const result = await service.reject('campaign-1', 'admin-1', { reason: 'Budget too high' });

      expect(result).toHaveProperty('status', 'REJECTED');
      expect(mockCampaignRepository.createApproval).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REJECTED', comments: 'Budget too high' }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'REJECT' }),
      );
    });
  });

  describe('requestChanges', () => {
    it('should move a PENDING_REVIEW campaign to CHANGES_REQUESTED and audit it', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'PENDING_REVIEW' });
      mockCampaignRepository.update.mockResolvedValue({ ...draftCampaign, status: 'CHANGES_REQUESTED' });

      const result = await service.requestChanges('campaign-1', 'admin-1', { comments: 'Fix targeting' });

      expect(result).toHaveProperty('status', 'CHANGES_REQUESTED');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'STATUS_CHANGE' }),
      );
    });
  });

  describe('getAdminDetail', () => {
    it('returns the campaign in full with its wording flags, as the queue shows them', async () => {
      const campaign = { ...draftCampaign, status: 'PENDING_REVIEW', merchant: { businessName: 'Prerna Test Cafe' }, approvals: [] };
      mockCampaignRepository.findForAdminReview.mockResolvedValue(campaign);
      mockPolicyService.findingsForCampaigns.mockResolvedValue(new Map([['campaign-1', [{ rule: 'REQUIRES_RATING' }]]]));

      const detail = await service.getAdminDetail('campaign-1');

      expect(detail).toMatchObject({ id: 'campaign-1', merchant: { businessName: 'Prerna Test Cafe' }, policyFlags: [{ rule: 'REQUIRES_RATING' }] });
    });

    it('says not found for a campaign that does not exist or was deleted', async () => {
      mockCampaignRepository.findForAdminReview.mockResolvedValue(null);

      await expect(service.getAdminDetail('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listPendingReview', () => {
    it('should delegate to the repository', async () => {
      mockCampaignRepository.findPendingReview.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listPendingReview(1, 20);
      expect(mockCampaignRepository.findPendingReview).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('attaches wording flags to each campaign in the queue', async () => {
      const flag = { rule: 'POSITIVE_WORDING', severity: 'REVIEW', field: 'title', excerpt: 'great', message: 'm' };
      mockCampaignRepository.findPendingReview.mockResolvedValue({
        data: [{ ...draftCampaign, id: 'c-1' }, { ...draftCampaign, id: 'c-2' }],
        total: 2,
        page: 1,
        limit: 20,
      });
      mockPolicyService.findingsForCampaigns.mockResolvedValue(new Map([['c-1', [flag]]]));

      const result = await service.listPendingReview(1, 20);

      expect(result.total).toBe(2);
      expect(result.data[0].policyFlags).toEqual([flag]);
      expect(result.data[1].policyFlags).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should soft delete a DRAFT campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignRepository.softDelete.mockResolvedValue({ ...draftCampaign, deletedAt: new Date() });

      await service.remove('campaign-1');
      expect(mockCampaignRepository.softDelete).toHaveBeenCalledWith('campaign-1');
    });

    it('should reject deleting an ACTIVE campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      await expect(service.remove('campaign-1')).rejects.toThrow(BadRequestException);
    });
  });
});
