import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MerchantInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByToken(token: string) {
    return this.prisma.merchantInvitation.findUnique({
      where: { inviteToken: token },
      include: { merchant: { select: { id: true, businessName: true } } },
    });
  }

  async findPendingByMerchantAndEmail(merchantId: string, email: string) {
    return this.prisma.merchantInvitation.findFirst({
      where: { merchantId, email, status: 'PENDING', deletedAt: null },
    });
  }

  async findByMerchantId(merchantId: string) {
    return this.prisma.merchantInvitation.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.MerchantInvitationCreateInput) {
    return this.prisma.merchantInvitation.create({ data });
  }

  async update(id: string, data: Prisma.MerchantInvitationUpdateInput) {
    return this.prisma.merchantInvitation.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.merchantInvitation.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
  }
}
