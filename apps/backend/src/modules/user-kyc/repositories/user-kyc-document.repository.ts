import { Injectable } from '@nestjs/common';
import { DocumentVerificationStatus, Prisma, UserDocumentType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

/** The only user fields a reviewer needs next to a document — never the password hash or tokens. */
const REVIEW_USER_SELECT = { id: true, firstName: true, lastName: true, email: true, phone: true } satisfies Prisma.UserSelect;

export type KycDocumentWithUser = Prisma.UserKycDocumentGetPayload<{ include: { user: { select: typeof REVIEW_USER_SELECT } } }>;

/** A document can only be decided while it is still waiting for a decision. */
const REVIEWABLE_STATUSES: DocumentVerificationStatus[] = ['PENDING', 'UNDER_REVIEW'];

@Injectable()
export class UserKycDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.userKycDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.userKycDocument.findUnique({ where: { id } });
  }

  async findByUserAndType(userId: string, documentType: UserDocumentType) {
    return this.prisma.userKycDocument.findFirst({
      where: { userId, documentType, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.UserKycDocumentCreateInput) {
    return this.prisma.userKycDocument.create({ data });
  }

  async update(id: string, data: Prisma.UserKycDocumentUpdateInput) {
    return this.prisma.userKycDocument.update({ where: { id }, data });
  }

  async findManyForReview(params: {
    where: Prisma.UserKycDocumentWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.UserKycDocumentOrderByWithRelationInput;
  }): Promise<KycDocumentWithUser[]> {
    return this.prisma.userKycDocument.findMany({
      ...params,
      include: { user: { select: REVIEW_USER_SELECT } },
    });
  }

  async countForReview(where: Prisma.UserKycDocumentWhereInput) {
    return this.prisma.userKycDocument.count({ where });
  }

  async findByIdForReview(id: string): Promise<KycDocumentWithUser | null> {
    return this.prisma.userKycDocument.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: REVIEW_USER_SELECT } },
    });
  }

  /**
   * Records a decision only if the document is still awaiting one. The status check lives in the
   * UPDATE itself so two admins deciding at the same moment cannot both win. Returns false when
   * someone else already decided.
   */
  async decideIfReviewable(
    id: string,
    data: { verificationStatus: DocumentVerificationStatus; verifiedBy: string; verifiedAt: Date; rejectionReason?: string },
  ): Promise<boolean> {
    const { count } = await this.prisma.userKycDocument.updateMany({
      where: { id, deletedAt: null, verificationStatus: { in: REVIEWABLE_STATUSES } },
      data,
    });
    return count === 1;
  }

  async softDelete(id: string) {
    return this.prisma.userKycDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
