import { Injectable } from '@nestjs/common';
import { Prisma, ServiceChargeType } from '@prisma/client';

import { ERROR_CODES } from '@common/constants';
import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { lockMerchantWalletByMerchant } from '../../../database/prisma/row-lock';
import { ChargeAmounts } from '../billing';
import { SERVICE_CHARGE_REFERENCE_TYPE } from '../constants';

type Tx = Prisma.TransactionClient;

/** What is being charged for. `amounts.totalAmount` is taken from the merchant wallet's available balance. */
export interface ServiceChargeInput {
  merchantId: string;
  type: ServiceChargeType;
  subscriptionId?: string;
  campaignId?: string;
  periodStart: Date;
  periodEnd: Date;
  amounts: ChargeAmounts;
  remarks: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class MerchantSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The merchant's subscription that is still running (paid or waiting for its renewal), with its plan. */
  async findCurrent(merchantId: string) {
    return this.prisma.merchantSubscription.findFirst({
      where: { merchantId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Subscriptions whose period has ended and which the renewal job must deal with. */
  async findDueForRenewal(now: Date) {
    return this.prisma.merchantSubscription.findMany({
      where: { status: { in: ['ACTIVE', 'PAST_DUE'] }, periodEnd: { lte: now } },
      include: { plan: true, merchant: { select: { userId: true, businessName: true } } },
      orderBy: { periodEnd: 'asc' },
      take: 500,
    });
  }

  async update(id: string, data: Prisma.MerchantSubscriptionUpdateInput) {
    return this.prisma.merchantSubscription.update({ where: { id }, data });
  }

  async featuredPrice(): Promise<{ price: number; days: number }> {
    const config = await this.prisma.platformConfiguration.findFirst();
    return { price: Number(config?.featuredCampaignPrice ?? 199), days: config?.featuredCampaignDays ?? 7 };
  }

  /** The merchant's campaigns featured right now, other than `exceptCampaignId`. */
  async countFeaturedNow(merchantId: string, now: Date, exceptCampaignId: string) {
    return this.prisma.campaign.count({
      where: { merchantId, featured: true, featuredUntil: { gt: now }, id: { not: exceptCampaignId }, deletedAt: null },
    });
  }

  async findCampaignForMerchant(merchantId: string, campaignId: string) {
    return this.prisma.campaign.findFirst({
      where: { id: campaignId, merchantId, deletedAt: null },
      select: { id: true, title: true, status: true, featured: true, featuredUntil: true },
    });
  }

  /** Featuring a campaign that has run out drops it back among the rest. Featured with no end date is left alone. */
  async clearExpiredFeatures(now: Date): Promise<number> {
    const result = await this.prisma.campaign.updateMany({
      where: { featured: true, featuredUntil: { lte: now } },
      data: { featured: false },
    });
    return result.count;
  }

  /**
   * Charges the merchant wallet and records the charge, then lets `apply` make the change that was paid for, all in
   * one transaction under the wallet's row lock: two charges at once can not both spend the same balance, and if
   * `apply` fails nothing is charged. `apply` gets the new charge's id, to link it. A total of zero records nothing
   * and only applies (with a null id).
   * Throws INSUFFICIENT_BALANCE when the available balance is short.
   */
  async charge<T>(
    input: ServiceChargeInput,
    apply: (tx: Tx, chargeId: string | null) => Promise<T>,
  ): Promise<{ chargeId: string | null; result: T }> {
    return this.prisma.transaction(async (tx) => {
      const total = input.amounts.totalAmount;
      if (total <= 0) return { chargeId: null, result: await apply(tx, null) };

      await lockMerchantWalletByMerchant(tx, input.merchantId);
      const wallet = await tx.merchantWallet.findUnique({ where: { merchantId: input.merchantId } });
      const balanceBefore = Number(wallet?.availableBalance ?? 0);
      if (!wallet || balanceBefore < total) {
        throw new BadRequestException(
          `This needs ₹${total.toFixed(2)} (GST included) in your wallet, which has ₹${balanceBefore.toFixed(2)}. Please top up first.`,
          ERROR_CODES.INSUFFICIENT_BALANCE,
        );
      }

      const balanceAfter = round2(balanceBefore - total);
      await tx.merchantWallet.update({ where: { id: wallet.id }, data: { availableBalance: balanceAfter, totalSpent: { increment: total } } });
      const charge = await tx.merchantServiceCharge.create({
        data: {
          merchant: { connect: { id: input.merchantId } },
          type: input.type,
          ...(input.subscriptionId ? { subscription: { connect: { id: input.subscriptionId } } } : {}),
          campaignId: input.campaignId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          taxableAmount: input.amounts.taxableAmount,
          gstRate: input.amounts.gstRate,
          gstAmount: input.amounts.gstAmount,
          totalAmount: total,
        },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: wallet.id } },
          type: 'DEBIT',
          status: 'SUCCESS',
          amount: total,
          balanceBefore,
          balanceAfter,
          referenceType: SERVICE_CHARGE_REFERENCE_TYPE,
          referenceId: charge.id,
          remarks: input.remarks,
        },
      });
      await tx.merchantServiceCharge.update({ where: { id: charge.id }, data: { walletTransactionId: transaction.id } });

      return { chargeId: charge.id, result: await apply(tx, charge.id) };
    });
  }
}
