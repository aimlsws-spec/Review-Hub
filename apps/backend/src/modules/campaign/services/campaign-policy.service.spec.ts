import { CampaignPolicyViolationException } from '../exceptions/policy-violation.exception';

import { CampaignPolicyService } from './campaign-policy.service';

describe('CampaignPolicyService', () => {
  const prisma = { campaignTask: { findMany: jest.fn() } };
  let service: CampaignPolicyService;

  const campaign = (overrides: Record<string, unknown> = {}) => ({
    id: 'c-1',
    title: 'Try our new menu',
    shortDescription: 'Tell others what you thought',
    description: 'Visit us, try something, and write an honest review of your visit.',
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.campaignTask.findMany.mockResolvedValue([]);
    service = new CampaignPolicyService(prisma as never);
  });

  describe('check', () => {
    it('allows honest wording and needs no database', () => {
      const result = service.check([{ field: 'title', text: 'Share your honest feedback' }]);
      expect(result).toEqual({ allowed: true, findings: [] });
      expect(prisma.campaignTask.findMany).not.toHaveBeenCalled();
    });

    it('does not allow a demand for a rating', () => {
      const result = service.check([{ field: 'title', text: 'Give us 5 stars and get Rs 50' }]);
      expect(result.allowed).toBe(false);
      expect(result.findings[0]).toMatchObject({ severity: 'BLOCK', field: 'title' });
    });

    it('keeps a lesser finding without blocking', () => {
      const result = service.check([{ field: 'title', text: 'Read our great reviews from happy customers' }]);
      expect(result.allowed).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('accepts empty and missing fields', () => {
      expect(service.check([{ field: 'title' }, { field: 'description', text: '' }]).allowed).toBe(true);
    });
  });

  describe('assertAllowed', () => {
    it('throws a 422 policy violation carrying the findings', () => {
      try {
        service.assertAllowed([{ field: 'special offer', text: 'Free tea for 5 star ratings' }], 'recommended');
        fail('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CampaignPolicyViolationException);
        const violation = error as CampaignPolicyViolationException;
        expect(violation.getStatus()).toBe(422);
        expect(violation.message).toContain('recommended');
        expect(violation.message).toContain('special offer');
      }
    });

    it('does nothing for honest wording', () => {
      expect(() => service.assertAllowed([{ field: 'special offer', text: 'Free tea with any meal' }], 'recommended')).not.toThrow();
    });
  });

  describe('campaigns', () => {
    it('finds problems in a task, and names the task', async () => {
      prisma.campaignTask.findMany.mockResolvedValue([
        { campaignId: 'c-1', title: 'Write a review', description: 'Post it.', instructions: 'Leave 5 stars on Google Maps.' },
      ]);

      const findings = await service.findingsForCampaign(campaign());

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].field).toContain('Write a review');
      expect(findings[0].field).toContain('instructions');
    });

    it('asks the database once for a whole page, and keeps each campaign separate', async () => {
      prisma.campaignTask.findMany.mockResolvedValue([
        { campaignId: 'c-2', title: 'Rate us', description: 'Rate us 5 stars', instructions: 'x' },
      ]);

      const map = await service.findingsForCampaigns([campaign({ id: 'c-1' }), campaign({ id: 'c-2' })]);

      expect(prisma.campaignTask.findMany).toHaveBeenCalledTimes(1);
      expect(map.get('c-1')).toEqual([]);
      expect(map.get('c-2')?.length).toBeGreaterThan(0);
    });

    it('does not read tasks that were deleted', async () => {
      await service.findingsForCampaign(campaign());
      expect(prisma.campaignTask.findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
    });

    it('does not touch the database for an empty page', async () => {
      expect((await service.findingsForCampaigns([])).size).toBe(0);
      expect(prisma.campaignTask.findMany).not.toHaveBeenCalled();
    });

    it('asserts a clean campaign, and refuses one with a blocking title', async () => {
      await expect(service.assertCampaignAllowed(campaign(), 'submitted')).resolves.toBeUndefined();
      await expect(service.assertCampaignAllowed(campaign({ title: 'Five star review = Rs 100' }), 'approved')).rejects.toBeInstanceOf(
        CampaignPolicyViolationException,
      );
    });

    it('does not refuse a campaign that only has lesser findings', async () => {
      await expect(service.assertCampaignAllowed(campaign({ title: 'Read our great reviews from happy customers' }), 'submitted')).resolves.toBeUndefined();
    });
  });

  describe('CampaignPolicyViolationException', () => {
    it('names at most three problems in the message and keeps all of them in the details', () => {
      const findings = Array.from({ length: 5 }, (_, i) => ({
        rule: 'REQUIRES_RATING',
        severity: 'BLOCK',
        field: `f${i}`,
        excerpt: `e${i}`,
        message: 'm.',
      })) as never[];

      const error = new CampaignPolicyViolationException('submitted', findings);

      expect(error.message).toContain('And 2 more.');
      expect(error.message).not.toContain('e4');
      expect(JSON.stringify(error.getResponse())).toContain('e4');
    });
  });
});
