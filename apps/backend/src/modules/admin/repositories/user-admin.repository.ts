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
}
