import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.merchant.findUnique({
      where: { id },
      include: { country: true, state: true, city: true, wallet: true },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.merchant.findUnique({
      where: { userId },
      include: { country: true, state: true, city: true, wallet: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.merchant.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    return this.prisma.merchant.findUnique({ where: { phone } });
  }

  async findByGst(gst: string) {
    return this.prisma.merchant.findUnique({ where: { gstNumber: gst } });
  }

  async findByPan(pan: string) {
    return this.prisma.merchant.findUnique({ where: { panNumber: pan } });
  }

  async create(data: Prisma.MerchantCreateInput) {
    return this.prisma.merchant.create({ data });
  }

  async update(id: string, data: Prisma.MerchantUpdateInput) {
    return this.prisma.merchant.update({ where: { id }, data });
  }

  async findPending(verificationStatus?: string) {
    const where: Prisma.MerchantWhereInput = { deletedAt: null };
    if (verificationStatus) {
      where.verificationStatus = verificationStatus as never;
    } else {
      where.verificationStatus = { in: ['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW'] as never };
    }
    return this.prisma.merchant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async findWithFilters(params: { page: number; limit: number; status?: string; search?: string }) {
    const { page, limit, status, search } = params;
    const where: Prisma.MerchantWhereInput = { deletedAt: null };
    if (status) where.status = status as never;
    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.merchant.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
