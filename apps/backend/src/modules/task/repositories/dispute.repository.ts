import { Injectable } from '@nestjs/common';
import { DisputeStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

// `user: true` would also hand the admin portal the user's passwordHash, googleId, appleId and
// lastLoginIp — this is the only shape a dispute (or its list) is ever allowed to return.
const SAFE_USER_SELECT = { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } as const;

@Injectable()
export class DisputeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DisputeUncheckedCreateInput) {
    return this.prisma.dispute.create({ data });
  }

  async findById(id: string) {
    return this.prisma.dispute.findUnique({
      where: { id },
      include: {
        submission: { include: { task: true } },
        user: { select: SAFE_USER_SELECT },
      },
    });
  }

  async findBySubmissionId(submissionId: string) {
    return this.prisma.dispute.findUnique({ where: { submissionId } });
  }

  async findMany(params: { skip?: number; take?: number; status?: DisputeStatus }) {
    const { skip, take, status } = params;

    return this.prisma.dispute.findMany({
      skip,
      take,
      where: { ...(status ? { status } : {}) },
      include: {
        submission: { include: { task: true } },
        user: { select: SAFE_USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: { status?: DisputeStatus }) {
    return this.prisma.dispute.count({
      where: { ...(params.status ? { status: params.status } : {}) },
    });
  }

  async update(id: string, data: Prisma.DisputeUncheckedUpdateInput) {
    return this.prisma.dispute.update({
      where: { id },
      data,
    });
  }
}
