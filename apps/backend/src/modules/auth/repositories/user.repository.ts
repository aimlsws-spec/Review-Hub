import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { roleClaimForSlug } from '../constants';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdSimple(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdWithRoles(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.findByIdWithRoles(id);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByReferralCode(referralCode: string) {
    return this.prisma.user.findUnique({ where: { referralCode } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByAppleId(appleId: string) {
    return this.prisma.user.findUnique({ where: { appleId } });
  }

  async findByEmailOrPhone(email?: string, phone?: string) {
    if (email && phone) {
      return this.prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    }
    if (email) return this.findByEmail(email);
    if (phone) return this.findByPhone(phone);
    return null;
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'DEACTIVATED' } });
  }

  /**
   * Deletes an account the person asked to close: soft delete, plus clearing the email, phone and Google/Apple links so
   * they can sign up again later. The row itself stays, so wallet history, submissions and audit logs keep pointing at
   * it. Devices are deactivated and their push tokens dropped in the same transaction.
   */
  async deleteAndReleaseIdentifiers(id: string) {
    return this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'DEACTIVATED', email: null, phone: null, googleId: null, appleId: null },
      }),
      this.prisma.device.updateMany({ where: { userId: id }, data: { isActive: false, pushToken: null } }),
    ]);
  }

  /** What still stops this account from being deleted: money in the wallet, a withdrawal in flight, or a business. */
  async findDeletionBlockers(id: string) {
    const [wallet, openWithdrawals, merchant] = await Promise.all([
      this.prisma.userWallet.findUnique({
        where: { userId: id },
        select: { availableBalance: true, pendingBalance: true, lockedBalance: true },
      }),
      this.prisma.withdrawalRequest.count({
        where: { wallet: { userId: id }, status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] } },
      }),
      this.prisma.merchant.findFirst({ where: { userId: id, deletedAt: null }, select: { id: true } }),
    ]);
    return {
      hasBalance: !!wallet && (wallet.availableBalance.gt(0) || wallet.pendingBalance.gt(0) || wallet.lockedBalance.gt(0)),
      hasOpenWithdrawal: openWithdrawals > 0,
      ownsMerchant: merchant !== null,
    };
  }

  async incrementFailedAttempts(id: string) {
    return this.prisma.user.update({ where: { id }, data: { failedLoginAttempts: { increment: 1 } } });
  }

  async resetFailedAttempts(id: string) {
    return this.prisma.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  async lockAccount(id: string, until: Date) {
    return this.prisma.user.update({ where: { id }, data: { lockedUntil: until } });
  }

  async updateLastLogin(id: string, ip: string) {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
  }

  async countByEmail(email: string) {
    return this.prisma.user.count({ where: { email } });
  }

  async countByPhone(phone: string) {
    return this.prisma.user.count({ where: { phone } });
  }

  async getRoleNames(id: string): Promise<string[]> {
    const result = await this.prisma.userRole.findMany({
      where: { userId: id },
      include: { role: { select: { slug: true } } },
    });
    // These feed straight into the JWT's `role` claim, which RolesGuard compares against the SystemRole and
    // AdminRole enums ('ADMIN', 'SUPER_ADMIN', 'FINANCE_TEAM'). Role.slug in the DB is lowercase-kebab
    // ('admin', 'super-admin'), so it is upper-cased with dashes turned into underscores.
    return result.map((ur) => roleClaimForSlug(ur.role.slug));
  }
}
