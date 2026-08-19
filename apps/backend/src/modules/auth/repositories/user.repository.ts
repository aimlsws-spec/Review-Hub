import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

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
    // Uppercased because these feed straight into the JWT's `role` claim, which
    // RolesGuard compares against the SystemRole enum ('ADMIN', 'MERCHANT', 'USER') —
    // Role.slug in the DB is lowercase-kebab (e.g. 'admin', 'super-admin').
    return result.map((ur) => ur.role.slug.toUpperCase());
  }
}
