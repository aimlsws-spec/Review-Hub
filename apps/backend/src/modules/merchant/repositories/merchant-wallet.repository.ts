import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  lockCampaign,
  lockMerchantWalletById,
  lockMerchantWalletByMerchant,
  lockWalletTransaction,
} from '../../../database/prisma/row-lock';

@Injectable()
export class MerchantWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchantId(merchantId: string) {
    return this.prisma.merchantWallet.findUnique({ where: { merchantId } });
  }

  async findTransactions(merchantWalletId: string, page: number, limit: number) {
    const where = { merchantWalletId };
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async createWallet(data: Prisma.MerchantWalletCreateInput) {
    return this.prisma.merchantWallet.create({ data });
  }

  /** The merchant's wallet, created on first use. A request that loses the creation race returns the winner's wallet. */
  async getOrCreate(merchantId: string) {
    const existing = await this.findByMerchantId(merchantId);
    if (existing) return existing;

    try {
      return await this.createWallet({ merchant: { connect: { id: merchantId } } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const created = await this.findByMerchantId(merchantId);
        if (created) return created;
      }
      throw error;
    }
  }

  /**
   * Records a recharge attempt without moving any balance — the wallet is
   * only credited once the payment gateway confirms the payment actually
   * captured (see confirmTopUp), never at order-creation time.
   */
  async createPendingTopUp(params: { merchantWalletId: string; amount: number; razorpayOrderId: string }) {
    const { merchantWalletId, amount, razorpayOrderId } = params;
    const wallet = await this.prisma.merchantWallet.findUniqueOrThrow({ where: { id: merchantWalletId } });

    return this.prisma.walletTransaction.create({
      data: {
        merchantWallet: { connect: { id: merchantWalletId } },
        type: 'CREDIT',
        status: 'PENDING',
        amount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: wallet.availableBalance,
        referenceType: 'RazorpayOrder',
        referenceId: razorpayOrderId,
        remarks: 'Wallet recharge via Razorpay',
      },
    });
  }

  async findPendingTopUpByOrderId(razorpayOrderId: string) {
    return this.prisma.walletTransaction.findFirst({
      where: { referenceType: 'RazorpayOrder', referenceId: razorpayOrderId, status: 'PENDING' },
    });
  }

  /** Idempotent — a transaction that's already SUCCESS/FAILED is returned as-is rather than re-applied. */
  async confirmTopUp(transactionId: string, razorpayPaymentId: string) {
    return this.prisma.transaction(async (tx) => {
      await lockWalletTransaction(tx, transactionId);
      const txn = await tx.walletTransaction.findUniqueOrThrow({ where: { id: transactionId } });
      if (txn.status !== 'PENDING' || !txn.merchantWalletId) return txn;

      await lockMerchantWalletById(tx, txn.merchantWalletId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: txn.merchantWalletId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + Number(txn.amount);

      await tx.merchantWallet.update({
        where: { id: txn.merchantWalletId },
        data: { availableBalance: balanceAfter, totalTopUp: { increment: txn.amount } },
      });

      return tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'SUCCESS',
          balanceBefore,
          balanceAfter,
          metadata: { razorpayPaymentId },
        },
      });
    });
  }

  async failTopUp(transactionId: string, reason: string) {
    return this.prisma.walletTransaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED', remarks: reason },
    });
  }

  /**
   * Holds a campaign's total budget out of the merchant's available balance
   * for the lifetime of the campaign. Validated inside the transaction, not
   * before it, so two concurrent activations can't both pass a balance check
   * against the same stale read.
   */
  async reserveCampaignBudget(params: { merchantId: string; campaignId: string; amount: number }) {
    const { merchantId, campaignId, amount } = params;

    return this.prisma.transaction(async (tx) => {
      await lockCampaign(tx, campaignId);
      await lockMerchantWalletByMerchant(tx, merchantId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { merchantId } });
      if (Number(wallet.availableBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance to activate this campaign');
      }

      const balanceBefore = wallet.availableBalance;
      const availableAfter = Number(balanceBefore) - amount;

      await tx.merchantWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: availableAfter,
          reservedBalance: { increment: amount },
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { reservedBudget: amount },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: wallet.id } },
          type: 'HOLD',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: availableAfter,
          referenceType: 'Campaign',
          referenceId: campaignId,
          remarks: 'Campaign activated — budget reserved',
        },
      });
    });
  }

  /**
   * Moves one reward payout's worth of budget from reserved to spent, on both the wallet and the campaign.
   *
   * Idempotent per reward: a reward that has already been charged is not charged again, so a job that failed after
   * paying the user can be retried until the merchant has been charged too.
   */
  async spendCampaignBudget(params: { campaignId: string; amount: number; rewardId: string }) {
    const { campaignId, amount, rewardId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockCampaign(tx, campaignId);
      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      await lockMerchantWalletByMerchant(tx, campaign.merchantId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { merchantId: campaign.merchantId } });

      const alreadyCharged = await tx.walletTransaction.findFirst({
        where: { merchantWalletId: wallet.id, type: 'SPEND', referenceType: 'Reward', referenceId: rewardId, status: 'SUCCESS' },
      });
      if (alreadyCharged) return alreadyCharged;

      const balanceBefore = wallet.reservedBalance;
      const reservedAfter = Number(balanceBefore) - amount;

      await tx.merchantWallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: reservedAfter,
          totalSpent: { increment: amount },
        },
      });

      const spentBudget = Number(campaign.spentBudget) + amount;
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          reservedBudget: { decrement: amount },
          spentBudget,
          remainingBudget: Number(campaign.totalBudget) - spentBudget,
        },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: wallet.id } },
          type: 'SPEND',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: reservedAfter,
          referenceType: 'Reward',
          referenceId: rewardId,
          remarks: 'Reward paid out of campaign budget',
        },
      });
    });
  }

  /**
   * Exact inverse of spendCampaignBudget — used when a reward is clawed back
   * after fraud is confirmed. Restores the full original amount to the
   * merchant regardless of how much was actually recovered from the user;
   * the platform absorbs any shortfall rather than the merchant.
   */
  async restoreClawedBackBudget(params: { campaignId: string; amount: number; rewardId: string }) {
    const { campaignId, amount, rewardId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockCampaign(tx, campaignId);
      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      await lockMerchantWalletByMerchant(tx, campaign.merchantId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { merchantId: campaign.merchantId } });
      const balanceBefore = wallet.reservedBalance;
      const reservedAfter = Number(balanceBefore) + amount;

      await tx.merchantWallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: reservedAfter,
          totalSpent: { decrement: amount },
        },
      });

      const spentBudget = Number(campaign.spentBudget) - amount;
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          reservedBudget: { increment: amount },
          spentBudget,
          remainingBudget: Number(campaign.totalBudget) - spentBudget,
        },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: wallet.id } },
          type: 'RELEASE',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: reservedAfter,
          referenceType: 'Reward',
          referenceId: rewardId,
          remarks: 'Reward reversed — fraud confirmed, campaign budget restored',
        },
      });
    });
  }

  /** Releases whatever budget a campaign never spent back to the merchant's available balance — cancel/expire/complete. */
  async releaseCampaignBudget(params: { merchantId: string; campaignId: string }) {
    const { merchantId, campaignId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockCampaign(tx, campaignId);
      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      const amount = Number(campaign.reservedBudget);
      if (amount <= 0) return null;

      await lockMerchantWalletByMerchant(tx, merchantId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { merchantId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + amount;

      await tx.merchantWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: balanceAfter,
          reservedBalance: { decrement: amount },
        },
      });
      await tx.campaign.update({
        where: { id: campaignId },
        data: { reservedBudget: 0 },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: wallet.id } },
          type: 'RELEASE',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'Campaign',
          referenceId: campaignId,
          remarks: 'Unused campaign budget released back to wallet',
        },
      });
    });
  }

  /**
   * Holds a refund request's amount out of available balance the moment it's
   * requested — mirrors UserWalletRepository.holdForWithdrawal. Validated
   * inside the transaction so two concurrent requests can't both pass a
   * balance check against the same stale read.
   */
  async holdForRefund(params: { merchantWalletId: string; amount: number; refundId: string }) {
    const { merchantWalletId, amount, refundId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockMerchantWalletById(tx, merchantWalletId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: merchantWalletId } });
      if (Number(wallet.availableBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const balanceBefore = wallet.availableBalance;
      const availableAfter = Number(balanceBefore) - amount;

      await tx.merchantWallet.update({
        where: { id: merchantWalletId },
        data: {
          availableBalance: availableAfter,
          refundBalance: { increment: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: merchantWalletId } },
          type: 'HOLD',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: availableAfter,
          referenceType: 'MerchantRefundRequest',
          referenceId: refundId,
          remarks: 'Refund requested — amount held pending review',
        },
      });
    });
  }

  /** Gives a rejected (or cancelled) refund's held amount back to available balance. */
  async releaseRefundHold(params: { merchantWalletId: string; amount: number; refundId: string }) {
    const { merchantWalletId, amount, refundId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockMerchantWalletById(tx, merchantWalletId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: merchantWalletId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + amount;

      await tx.merchantWallet.update({
        where: { id: merchantWalletId },
        data: {
          availableBalance: balanceAfter,
          refundBalance: { decrement: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: merchantWalletId } },
          type: 'RELEASE',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'MerchantRefundRequest',
          referenceId: refundId,
          remarks: 'Refund request rejected — hold released back to wallet',
        },
      });
    });
  }

  /** Clears a held amount for good — an approved refund moving toward payout. */
  async finalizeRefund(params: { merchantWalletId: string; amount: number; refundId: string }) {
    const { merchantWalletId, amount, refundId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockMerchantWalletById(tx, merchantWalletId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: merchantWalletId } });
      const balanceBefore = wallet.refundBalance;
      const refundBalanceAfter = Number(balanceBefore) - amount;

      await tx.merchantWallet.update({
        where: { id: merchantWalletId },
        data: {
          refundBalance: refundBalanceAfter,
          totalRefunded: { increment: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: merchantWalletId } },
          type: 'REFUND',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter: refundBalanceAfter,
          referenceType: 'MerchantRefundRequest',
          referenceId: refundId,
          remarks: 'Refund approved',
        },
      });
    });
  }

  /**
   * Undoes a finalized refund after the fact — the payout gateway reported
   * it definitively failed or was reversed post-approval, so the money that
   * left totalRefunded needs to come back to available balance.
   */
  async reverseFinalizedRefund(params: { merchantWalletId: string; amount: number; refundId: string }) {
    const { merchantWalletId, amount, refundId } = params;

    return this.prisma.transaction(async (tx) => {
      await lockMerchantWalletById(tx, merchantWalletId);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: merchantWalletId } });
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = Number(balanceBefore) + amount;

      await tx.merchantWallet.update({
        where: { id: merchantWalletId },
        data: {
          availableBalance: balanceAfter,
          totalRefunded: { decrement: amount },
        },
      });

      return tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: merchantWalletId } },
          type: 'RELEASE',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'MerchantRefundRequest',
          referenceId: refundId,
          remarks: 'Payout failed or was reversed by the gateway after approval',
        },
      });
    });
  }

  /** Enable/configure or disable auto-recharge. Disabling clears threshold/amount rather than just flipping the flag, so a later re-enable never silently reuses a stale value. */
  async updateAutoRechargeSettings(merchantId: string, settings: { enabled: boolean; threshold?: number; amount?: number }) {
    const wallet = await this.getOrCreate(merchantId);
    return this.prisma.merchantWallet.update({
      where: { id: wallet.id },
      data: {
        autoRechargeEnabled: settings.enabled,
        autoRechargeThreshold: settings.enabled ? settings.threshold : null,
        autoRechargeAmount: settings.enabled ? settings.amount : null,
      },
    });
  }

  /**
   * Wallets due for the auto-recharge sweep: enabled, at or below their threshold, and not
   * recharged within the cooldown window. `availableBalance <= autoRechargeThreshold` compares
   * two columns on the same row, which Prisma's query builder can't express — hence raw SQL.
   */
  async findWalletsDueForAutoRecharge(cooldownMinutes: number): Promise<{ id: string; merchantId: string; availableBalance: Prisma.Decimal; autoRechargeThreshold: Prisma.Decimal; autoRechargeAmount: Prisma.Decimal }[]> {
    const cooldownCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT id, merchantId, availableBalance, autoRechargeThreshold, autoRechargeAmount
      FROM merchant_wallets
      WHERE autoRechargeEnabled = 1
        AND autoRechargeThreshold IS NOT NULL
        AND autoRechargeAmount IS NOT NULL
        AND availableBalance <= autoRechargeThreshold
        AND (lastAutoRechargeAt IS NULL OR lastAutoRechargeAt < ${cooldownCutoff})
    `);
  }

  async markAutoRechargeAttempted(merchantWalletId: string) {
    await this.prisma.merchantWallet.update({
      where: { id: merchantWalletId },
      data: { lastAutoRechargeAt: new Date() },
    });
  }
}
