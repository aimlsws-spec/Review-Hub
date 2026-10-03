import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

const SAFE_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  lastLoginAt: true,
  referralCode: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; status?: UserStatus; search?: string }) {
    const { page, limit, status, search } = params;
    const where: Prisma.UserWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  }

  async updateStatus(id: string, status: UserStatus) {
    return this.prisma.user.update({ where: { id }, data: { status }, select: SAFE_USER_SELECT });
  }

  /** Slugs of every role the user holds, e.g. ['admin', 'finance-team']. */
  async getRoleSlugs(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({ where: { userId }, select: { role: { select: { slug: true } } } });
    return rows.map((row) => row.role.slug);
  }

  async findRoleBySlug(slug: string) {
    return this.prisma.role.findFirst({ where: { slug, deletedAt: null }, select: { id: true, slug: true } });
  }

  /** Gives the role; giving one the user already has changes nothing. */
  async grantRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId, assignedBy },
    });
  }

  async revokeRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
  }

  /** Ends every session, so a removed role stops working at the next refresh rather than at the session's end. */
  async revokeSessions(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  /**
   * One level of the referral tree: the people this user referred, newest first, each with how many people they
   * referred in turn so the admin page can offer to open that level. At most 50 per page.
   */
  async getReferrals(userId: string, page: number, limit: number) {
    const cappedLimit = Math.min(limit, 50);
    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId: userId, deletedAt: null },
        include: {
          referredUser: {
            select: { id: true, firstName: true, lastName: true, createdAt: true },
          },
        },
        skip: (page - 1) * cappedLimit,
        take: cappedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count({ where: { referrerId: userId, deletedAt: null } }),
    ]);

    const referredUserIds = data.map((r) => r.referredUserId);
    const counts =
      referredUserIds.length === 0
        ? []
        : await this.prisma.referral.groupBy({
            by: ['referrerId'],
            where: { referrerId: { in: referredUserIds }, deletedAt: null },
            _count: { _all: true },
          });
    const countMap = Object.fromEntries(counts.map(c => [c.referrerId, c._count._all]));

    const mapped = data.map((ref) => ({
      id: ref.id,
      referredUserId: ref.referredUserId,
      name: `${ref.referredUser.firstName} ${ref.referredUser.lastName}`.trim(),
      joinedAt: ref.referredUser.createdAt,
      rewardIssued: ref.rewardIssued,
      ownReferralCount: countMap[ref.referredUserId] ?? 0,
    }));

    return { data: mapped, total, page, limit: cappedLimit };
  }

  /** Who referred this user, if anyone: the level above in the tree. */
  async getReferrer(userId: string) {
    const ref = await this.prisma.referral.findFirst({
      where: { referredUserId: userId, deletedAt: null },
      include: {
        referrer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!ref) return null;
    return {
      id: ref.id,
      referrerId: ref.referrerId,
      name: `${ref.referrer.firstName} ${ref.referrer.lastName}`.trim(),
    };
  }
}
