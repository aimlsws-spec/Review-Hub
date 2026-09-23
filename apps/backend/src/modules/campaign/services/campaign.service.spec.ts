import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { CampaignSort } from '@common/enums';
import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { MerchantWalletRepository } from '../../merchant/repositories';
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
    update: jest.fn(),
    softDelete: jest.fn(),
    findByMerchant: jest.fn(),
    findPublic: jest.fn(),
    findPublicById: jest.fn(),
    createApproval: jest.fn(),
    findPendingReview: jest.fn(),
  };

  const mockMerchantWalletRepository = {
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
    status: 'DRAFT',
    autoApprove: false,
    totalBudget: 5000,
    spentBudget: 0,
  };

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
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('campaign.created', expect.any(Object));
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

    it('should reject submitting a campaign that is not DRAFT/CHANGES_REQUESTED', async () => {
      mockCampaignRepository.findById.mockResolvedValue({ ...draftCampaign, status: 'ACTIVE' });

      await expect(service.submitForApproval('campaign-1')).rejects.toThrow(BadRequestException);
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
