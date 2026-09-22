import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { BroadcastAudienceRepository } from './broadcast-audience.repository';

describe('BroadcastAudienceRepository', () => {
  let repository: BroadcastAudienceRepository;

  const mockPrisma = {
    user: { count: jest.fn(), findMany: jest.fn() },
    state: { findMany: jest.fn() },
  };

  // A fixed "now" so the age and date maths can be checked exactly.
  const now = new Date('2026-09-19T00:00:00.000Z');

  const BASELINE = [
    { deletedAt: null },
    { status: 'ACTIVE' },
    { userRoles: { some: { role: { slug: 'user' } } } },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BroadcastAudienceRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BroadcastAudienceRepository>(BroadcastAudienceRepository);
    jest.clearAllMocks();
  });

  describe('buildWhere', () => {
    it('always limits to active, non-deleted app users, even with an empty filter', () => {
      expect(repository.buildWhere({}, now)).toEqual({ AND: BASELINE });
    });

    it('never lets a filter widen the baseline: merchants, admins and inactive accounts stay excluded', () => {
      const { AND } = repository.buildWhere({ cityIds: ['c1'] }, now) as { AND: unknown[] };
      expect(AND.slice(0, 3)).toEqual(BASELINE);
    });

    it('filters by state, city and gender', () => {
      const { AND } = repository.buildWhere({ stateIds: ['s1'], cityIds: ['c1'], gender: 'FEMALE' }, now) as { AND: unknown[] };
      expect(AND).toEqual(expect.arrayContaining([{ stateId: { in: ['s1'] } }, { cityId: { in: ['c1'] } }, { gender: 'FEMALE' }]));
    });

    it('ignores empty location lists instead of matching nobody', () => {
      const { AND } = repository.buildWhere({ stateIds: [], cityIds: [] }, now) as { AND: unknown[] };
      expect(AND).toEqual(BASELINE);
    });

    it('turns a minimum age into a latest allowed birth date', () => {
      const { AND } = repository.buildWhere({ minAge: 18 }, now) as { AND: unknown[] };
      expect(AND).toContainEqual({ dateOfBirth: { lte: new Date('2008-09-19T00:00:00.000Z') } });
    });

    it('turns a maximum age into an earliest allowed birth date (someone turning 31 tomorrow is still 30)', () => {
      const { AND } = repository.buildWhere({ maxAge: 30 }, now) as { AND: unknown[] };
      expect(AND).toContainEqual({ dateOfBirth: { gt: new Date('1995-09-19T00:00:00.000Z') } });
    });

    it('counts a user with no gamification profile as level 1', () => {
      const { AND } = repository.buildWhere({ minLevel: 1, maxLevel: 3 }, now) as { AND: unknown[] };
      expect(AND).toContainEqual({
        OR: [{ gamificationProfile: { is: { level: { gte: 1, lte: 3 } } } }, { gamificationProfile: { is: null } }],
      });
    });

    it('does not include profile-less users when the level range excludes level 1', () => {
      const { AND } = repository.buildWhere({ minLevel: 5 }, now) as { AND: unknown[] };
      expect(AND).toContainEqual({ OR: [{ gamificationProfile: { is: { level: { gte: 5, lte: undefined } } } }] });
    });

    it('matches KYC-verified users by an approved PAN, and the opposite for false', () => {
      const approvedPan = { documentType: 'PAN', verificationStatus: 'APPROVED', deletedAt: null };

      const verified = repository.buildWhere({ kycVerified: true }, now) as { AND: unknown[] };
      const unverified = repository.buildWhere({ kycVerified: false }, now) as { AND: unknown[] };

      expect(verified.AND).toContainEqual({ kycDocuments: { some: approvedPan } });
      expect(unverified.AND).toContainEqual({ kycDocuments: { none: approvedPan } });
    });

    it('filters recent joiners by their sign-up date', () => {
      const { AND } = repository.buildWhere({ joinedWithinDays: 7 }, now) as { AND: unknown[] };
      expect(AND).toContainEqual({ createdAt: { gte: new Date('2026-09-12T00:00:00.000Z') } });
    });

    it('treats a user who never logged in as inactive once their account is old enough', () => {
      const { AND } = repository.buildWhere({ inactiveForDays: 30 }, now) as { AND: unknown[] };
      const cutoff = new Date('2026-08-20T00:00:00.000Z');
      expect(AND).toContainEqual({ OR: [{ lastLoginAt: { lt: cutoff } }, { lastLoginAt: null, createdAt: { lt: cutoff } }] });
    });

    it('combines every filter with AND', () => {
      const { AND } = repository.buildWhere({ gender: 'MALE', minAge: 20, kycVerified: true, joinedWithinDays: 30 }, now) as { AND: unknown[] };
      expect(AND).toHaveLength(BASELINE.length + 4);
    });
  });

  describe('reach', () => {
    it('reports the total and what each channel would really reach', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(100).mockResolvedValueOnce(95).mockResolvedValueOnce(60).mockResolvedValueOnce(80);

      const reach = await repository.reach({});

      expect(reach).toEqual({ total: 100, byChannel: { IN_APP: 95, PUSH: 60, EMAIL: 80 } });
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(4);
    });

    it('skips users who opted out of a channel, and counts push only for users with an active device token', async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      await repository.reach({});

      const [, inApp, push, email] = mockPrisma.user.count.mock.calls.map((call) => JSON.stringify(call[0].where));
      expect(inApp).toContain('"inAppEnabled":false');
      expect(email).toContain('"emailEnabled":false');
      expect(email).toContain('"email":{"not":null}');
      expect(push).toContain('"pushEnabled":false');
      expect(push).toContain('"devices":{"some":{"isActive":true,"pushToken":{"not":null}}}');
    });
  });

  describe('findPage', () => {
    it('starts from the beginning without a cursor', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await repository.findPage({}, null, 500);

      const args = mockPrisma.user.findMany.mock.calls[0][0];
      expect(args.take).toBe(500);
      expect(args.orderBy).toEqual({ id: 'asc' });
      expect(args.select).toEqual({ id: true, firstName: true });
      // Only the audience rules: no "after this id" bound on the first page.
      expect(args.where.AND).toHaveLength(1);
      expect(JSON.stringify(args.where)).not.toContain('"gt"');
    });

    it('resumes strictly after the cursor so nobody is queued twice', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await repository.findPage({}, 'user-42', 100);

      expect(mockPrisma.user.findMany.mock.calls[0][0].where.AND).toContainEqual({ id: { gt: 'user-42' } });
    });
  });

  describe('listLocations', () => {
    it('lists active states with their active cities by name', async () => {
      mockPrisma.state.findMany.mockResolvedValue([]);

      await repository.listLocations();

      expect(mockPrisma.state.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, cities: { where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } } },
      });
    });
  });
});
