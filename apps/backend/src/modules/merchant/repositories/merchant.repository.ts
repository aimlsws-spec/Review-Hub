import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type { VerificationFacts } from '../verification-level';

@Injectable()
export class MerchantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.merchant.findUnique({
      where: { id },
      include: { country: true, state: true, city: true, wallet: true },
    });
  }

  /** What the verification level (verification-level.ts) is worked out from. */
  async findVerificationFacts(merchantId: string): Promise<VerificationFacts | null> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { verificationStatus: true, user: { select: { phoneVerifiedAt: true, emailVerifiedAt: true } } },
    });
    if (!merchant) return null;
    const premiumSubscriptions = await this.prisma.merchantSubscription.count({
      where: { merchantId, status: 'ACTIVE', plan: { isPremium: true } },
    });
    return {
      phoneVerified: merchant.user.phoneVerifiedAt !== null,
      emailVerified: merchant.user.emailVerifiedAt !== null,
      businessVerified: merchant.verificationStatus === 'APPROVED',
      premium: premiumSubscriptions > 0,
    };
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

  /**
   * Approves the merchant together with the KYC documents and bank accounts that were waiting on that decision, in one
   * transaction. The admin reviews them all on the merchant's page before approving, so approving the merchant is
   * approving what they looked at; without this the merchant's own Documents page kept showing PENDING forever.
   *
   * Only rows still waiting are touched: a document already rejected stays rejected, and a bank account that failed
   * verification stays failed.
   */
  async approveWithDetails(merchantId: string, approvedBy: string) {
    const now = new Date();
    return this.prisma.transaction(async (tx) => {
      const merchant = await tx.merchant.update({
        where: { id: merchantId },
        data: { status: 'ACTIVE', verificationStatus: 'APPROVED', verifiedAt: now, verifiedBy: approvedBy },
      });
      const documents = await tx.merchantDocument.updateMany({
        where: { merchantId, deletedAt: null, verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { verificationStatus: 'APPROVED', verifiedBy: approvedBy, verifiedAt: now, rejectionReason: null },
      });
      const bankAccounts = await tx.merchantBankAccount.updateMany({
        where: { merchantId, deletedAt: null, verificationStatus: 'PENDING' },
        data: { verificationStatus: 'VERIFIED', verifiedAt: now },
      });
      return { merchant, documentsApproved: documents.count, bankAccountsVerified: bankAccounts.count };
    });
  }

  /**
   * Rejects the merchant and the KYC documents that were waiting, in one transaction, giving each document the same
   * reason. A rejected document is what lets the merchant upload a replacement (KycService refuses to replace an
   * approved one). Bank accounts are left as they are: rejecting the business says nothing about whether the account
   * exists, and marking it FAILED would block refunds to it later.
   */
  async rejectWithDocuments(merchantId: string, reason: string) {
    return this.prisma.transaction(async (tx) => {
      const merchant = await tx.merchant.update({
        where: { id: merchantId },
        data: { status: 'SUSPENDED', verificationStatus: 'REJECTED' },
      });
      const documents = await tx.merchantDocument.updateMany({
        where: { merchantId, deletedAt: null, verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { verificationStatus: 'REJECTED', rejectionReason: reason },
      });
      return { merchant, documentsRejected: documents.count };
    });
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
