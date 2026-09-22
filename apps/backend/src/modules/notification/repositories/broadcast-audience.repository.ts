import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BROADCAST_AUDIENCE_ROLE_SLUG } from '../constants';
import { AudienceFilter, AudienceReach } from '../interfaces';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The date exactly `years` years before `from`, used to turn "at least N years old" into a birth-date bound. */
function yearsBefore(from: Date, years: number): Date {
  const date = new Date(from);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

/**
 * Turns an admin's audience filter into database queries: how many users it matches, and the users
 * themselves in pages. It owns the rules for who is eligible, so counting and sending can never disagree.
 */
@Injectable()
export class BroadcastAudienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every broadcast goes only to active app users, whatever the filter says: a suspended, banned or
   * deactivated account, a merchant or an admin must never receive one.
   */
  buildWhere(filter: AudienceFilter, now: Date = new Date()): Prisma.UserWhereInput {
    const clauses: Prisma.UserWhereInput[] = [
      { deletedAt: null },
      { status: 'ACTIVE' },
      { userRoles: { some: { role: { slug: BROADCAST_AUDIENCE_ROLE_SLUG } } } },
    ];

    if (filter.stateIds?.length) clauses.push({ stateId: { in: filter.stateIds } });
    if (filter.cityIds?.length) clauses.push({ cityId: { in: filter.cityIds } });
    if (filter.gender) clauses.push({ gender: filter.gender });

    // Users without a date of birth are left out whenever an age bound is set: their age is unknown.
    if (filter.minAge !== undefined) clauses.push({ dateOfBirth: { lte: yearsBefore(now, filter.minAge) } });
    if (filter.maxAge !== undefined) clauses.push({ dateOfBirth: { gt: yearsBefore(now, filter.maxAge + 1) } });

    if (filter.minLevel !== undefined || filter.maxLevel !== undefined) {
      const level = { gte: filter.minLevel, lte: filter.maxLevel };
      const includesLevelOne = (filter.minLevel ?? 1) <= 1 && (filter.maxLevel ?? 1) >= 1;
      clauses.push({
        OR: [
          { gamificationProfile: { is: { level } } },
          // A profile is created lazily, so a user with none is effectively level 1.
          ...(includesLevelOne ? [{ gamificationProfile: { is: null } }] : []),
        ],
      });
    }

    if (filter.kycVerified !== undefined) {
      const approvedPan: Prisma.UserKycDocumentWhereInput = {
        documentType: 'PAN',
        verificationStatus: 'APPROVED',
        deletedAt: null,
      };
      clauses.push(filter.kycVerified ? { kycDocuments: { some: approvedPan } } : { kycDocuments: { none: approvedPan } });
    }

    if (filter.joinedWithinDays !== undefined) {
      clauses.push({ createdAt: { gte: new Date(now.getTime() - filter.joinedWithinDays * DAY_MS) } });
    }

    if (filter.inactiveForDays !== undefined) {
      const cutoff = new Date(now.getTime() - filter.inactiveForDays * DAY_MS);
      clauses.push({ OR: [{ lastLoginAt: { lt: cutoff } }, { lastLoginAt: null, createdAt: { lt: cutoff } }] });
    }

    return { AND: clauses };
  }

  /** How many users match, and how many of them a message on each channel would really reach. */
  async reach(filter: AudienceFilter): Promise<AudienceReach> {
    const base = this.buildWhere(filter);
    const optedOut = (field: 'inAppEnabled' | 'emailEnabled' | 'pushEnabled'): Prisma.UserWhereInput => ({
      NOT: { notificationPreference: { is: { [field]: false } } },
    });

    const [total, inApp, push, email] = await Promise.all([
      this.prisma.user.count({ where: base }),
      this.prisma.user.count({ where: { AND: [base, optedOut('inAppEnabled')] } }),
      // Matches NotificationService.dispatch: a device counts only when it is active and has a push token.
      this.prisma.user.count({
        where: { AND: [base, optedOut('pushEnabled'), { devices: { some: { isActive: true, pushToken: { not: null } } } }] },
      }),
      this.prisma.user.count({ where: { AND: [base, optedOut('emailEnabled'), { email: { not: null } }] } }),
    ]);

    return { total, byChannel: { IN_APP: inApp, PUSH: push, EMAIL: email } };
  }

  /** The next page of recipients after `afterId`, in id order so a send can resume exactly where it stopped. */
  async findPage(filter: AudienceFilter, afterId: string | null, take: number) {
    return this.prisma.user.findMany({
      where: { AND: [this.buildWhere(filter), ...(afterId ? [{ id: { gt: afterId } }] : [])] },
      orderBy: { id: 'asc' },
      take,
      select: { id: true, firstName: true },
    });
  }

  /** States with their cities, for the location pickers in the audience form. */
  async listLocations() {
    return this.prisma.state.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        cities: { where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } },
      },
    });
  }
}
