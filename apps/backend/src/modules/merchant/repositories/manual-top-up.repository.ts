import { Injectable } from '@nestjs/common';
import { ManualTopUpStatus, Prisma } from '@prisma/client';

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { lockManualTopUpAndWallet, lockMerchantWalletByMerchant } from '../../../database/prisma/row-lock';
import { MANUAL_TOP_UP } from '../constants';

type Tx = Prisma.TransactionClient;

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface TopUpRecord {
  merchantId: string;
  amount: number;
  bankReference: string;
  receivedOn: Date;
  note?: string;
  recordedBy: string;
  /** True when the amount is large enough that a different admin has to approve it before any money moves. */
  needsApproval: boolean;
}

/** What a credit or a reversal did to the wallet, for the notification and the audit entry. */
export interface LedgerMove {
  balanceBefore: number;
  balanceAfter: number;
}

/**
 * Every change to a bank-transfer top-up that can move money: recording one, approving or rejecting a large one, and
 * reversing one made in error. Each is one transaction that locks the top-up first and the wallet second, so the status
 * and the ledger change together, and two admins acting at the same moment can not both succeed.
 *
 * Lock order is top-up, then wallet (see database/prisma/row-lock.ts).
 */
@Injectable()
export class ManualTopUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a top-up. A small one is credited in the same transaction. A large one is only recorded, with nothing credited,
   * and waits for another admin. Either way the bank reference is claimed now, so the same transfer can not be entered
   * twice while one is waiting.
   */
  async record(params: TopUpRecord) {
    const { merchantId, amount, bankReference, receivedOn, note, recordedBy, needsApproval } = params;
    const walletId = await this.walletIdFor(merchantId);

    try {
      return await this.prisma.transaction(async (tx) => {
        await lockMerchantWalletByMerchant(tx, merchantId);
        const topUp = await tx.merchantManualTopUp.create({
          data: {
            merchantWallet: { connect: { id: walletId } },
            status: needsApproval ? 'PENDING_APPROVAL' : 'COMPLETED',
            amount,
            bankReference,
            receivedOn,
            note,
            recordedBy,
          },
        });
        if (needsApproval) return { topUp, move: null, transactionId: null };

        const credit = await this.credit(tx, walletId, amount, bankReference, recordedBy, receivedOn);
        const completed = await tx.merchantManualTopUp.update({ where: { id: topUp.id }, data: { walletTransaction: { connect: { id: credit.transactionId } } } });
        return { topUp: completed, move: credit.move, transactionId: credit.transactionId };
      });
    } catch (error) {
      throw this.asDomainError(error);
    }
  }

  /**
   * A different admin approves a large top-up, and the money is credited in the same step. The person who recorded it can
   * not approve it: the point of the second admin is a second pair of eyes.
   */
  async approve(params: { topUpId: string; adminId: string }) {
    const { topUpId, adminId } = params;

    return this.prisma.transaction(async (tx) => {
      const topUp = await this.lockAndRead(tx, topUpId);
      this.assertStatus(topUp.status, 'PENDING_APPROVAL', 'approved');
      if (topUp.recordedBy === adminId) throw new ForbiddenException('You recorded this top-up, so a different admin has to approve it.');

      const credit = await this.credit(tx, topUp.merchantWalletId, Number(topUp.amount), topUp.bankReference as string, topUp.recordedBy, topUp.receivedOn);
      const updated = await tx.merchantManualTopUp.update({
        where: { id: topUpId },
        data: { status: 'COMPLETED', decidedBy: adminId, decidedAt: new Date(), walletTransaction: { connect: { id: credit.transactionId } } },
        include: { merchantWallet: { select: { merchantId: true } } },
      });
      return { topUp: updated, move: credit.move };
    });
  }

  /**
   * A different admin turns a large top-up down. Nothing was credited, so nothing moves. The bank reference is given back,
   * so that if the transfer is real it can be recorded again properly.
   */
  async reject(params: { topUpId: string; adminId: string; reason: string }) {
    const { topUpId, adminId, reason } = params;

    return this.prisma.transaction(async (tx) => {
      const topUp = await this.lockAndRead(tx, topUpId);
      this.assertStatus(topUp.status, 'PENDING_APPROVAL', 'rejected');
      if (topUp.recordedBy === adminId) throw new ForbiddenException('You recorded this top-up, so a different admin has to decide it.');

      return tx.merchantManualTopUp.update({
        where: { id: topUpId },
        data: { status: 'REJECTED', decidedBy: adminId, decidedAt: new Date(), rejectionReason: reason, rejectedReference: topUp.bankReference, bankReference: null },
      });
    });
  }

  /**
   * Takes a top-up made in error back out of the wallet, with a new opposite entry: the original stays in the history. It
   * can only be reversed while the merchant still has the money: if some of it has been spent or set aside for a
   * campaign, reversing would leave them owing the platform, which needs a person to sort out.
   *
   * The bank reference stays used, so the same transfer can not be credited a second time by mistake.
   */
  async reverse(params: { topUpId: string; adminId: string; reason: string }) {
    const { topUpId, adminId, reason } = params;

    return this.prisma.transaction(async (tx) => {
      const topUp = await this.lockAndRead(tx, topUpId);
      this.assertStatus(topUp.status, 'COMPLETED', 'reversed');

      const amount = Number(topUp.amount);
      const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: topUp.merchantWalletId } });
      const balanceBefore = Number(wallet.availableBalance);
      if (balanceBefore < amount) {
        throw new BadRequestException(
          `Only ₹${balanceBefore.toFixed(2)} of this ₹${amount.toFixed(2)} is still available in the wallet: the rest has been spent or set aside for a campaign. It can not be reversed automatically.`,
        );
      }

      const balanceAfter = round2(balanceBefore - amount);
      await tx.merchantWallet.update({ where: { id: wallet.id }, data: { availableBalance: balanceAfter, totalTopUp: { decrement: amount } } });
      const transaction = await tx.walletTransaction.create({
        data: {
          merchantWallet: { connect: { id: wallet.id } },
          type: 'DEBIT',
          status: 'SUCCESS',
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: MANUAL_TOP_UP.REVERSAL_REFERENCE_TYPE,
          referenceId: topUp.id,
          remarks: `Bank-transfer top-up reversed (ref ${topUp.bankReference}): ${reason}`,
          metadata: { reversedBy: adminId },
        },
      });

      const updated = await tx.merchantManualTopUp.update({
        where: { id: topUpId },
        data: { status: 'REVERSED', reversedAt: new Date(), reversedBy: adminId, reversalReason: reason, reversalTransaction: { connect: { id: transaction.id } } },
        include: { merchantWallet: { select: { merchantId: true } } },
      });
      return { topUp: updated, move: { balanceBefore, balanceAfter } };
    });
  }

  /**
   * The merchant's wallet id, creating the wallet if this is its first money. Several top-ups arriving at the same moment
   * for a merchant with no wallet yet can all try to create it; the ones that lose the race to the unique merchant id use
   * the wallet the winner made.
   */
  private async walletIdFor(merchantId: string): Promise<string> {
    const existing = await this.prisma.merchantWallet.findUnique({ where: { merchantId }, select: { id: true } });
    if (existing) return existing.id;
    try {
      return (await this.prisma.merchantWallet.create({ data: { merchant: { connect: { id: merchantId } } }, select: { id: true } })).id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return (await this.prisma.merchantWallet.findUniqueOrThrow({ where: { merchantId }, select: { id: true } })).id;
      }
      throw error;
    }
  }

  async findById(id: string) {
    return this.prisma.merchantManualTopUp.findUnique({ where: { id }, include: { merchantWallet: { select: { merchantId: true } } } });
  }

  async findByMerchant(merchantId: string, page: number, limit: number) {
    return this.page({ merchantWallet: { merchantId } }, page, limit);
  }

  /** Large top-ups waiting for a second admin, across all merchants, oldest first. */
  async findPendingApproval(page: number, limit: number) {
    return this.page({ status: 'PENDING_APPROVAL' }, page, limit, 'asc');
  }

  private async page(where: Prisma.MerchantManualTopUpWhereInput, page: number, limit: number, order: 'asc' | 'desc' = 'desc') {
    const [data, total] = await Promise.all([
      this.prisma.merchantManualTopUp.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: order },
        include: { merchantWallet: { select: { merchantId: true, merchant: { select: { businessName: true } } } } },
      }),
      this.prisma.merchantManualTopUp.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Both locks are taken before anything is read, so what follows sees the wallet as the last transaction left it. */
  private async lockAndRead(tx: Tx, topUpId: string) {
    await lockManualTopUpAndWallet(tx, topUpId);
    const topUp = await tx.merchantManualTopUp.findUnique({ where: { id: topUpId } });
    if (!topUp) throw new NotFoundException('Top-up');
    return topUp;
  }

  private assertStatus(actual: ManualTopUpStatus, required: ManualTopUpStatus, verb: string): void {
    if (actual !== required) {
      throw new BadRequestException(`This top-up is ${actual.toLowerCase().replace(/_/g, ' ')}, so it can not be ${verb}.`);
    }
  }

  /** Adds the amount to the wallet and writes the ledger entry, inside the caller's transaction. */
  private async credit(tx: Tx, walletId: string, amount: number, bankReference: string, recordedBy: string, receivedOn: Date) {
    const wallet = await tx.merchantWallet.findUniqueOrThrow({ where: { id: walletId } });
    const balanceBefore = Number(wallet.availableBalance);
    const balanceAfter = round2(balanceBefore + amount);

    await tx.merchantWallet.update({ where: { id: walletId }, data: { availableBalance: balanceAfter, totalTopUp: { increment: amount } } });
    const transaction = await tx.walletTransaction.create({
      data: {
        merchantWallet: { connect: { id: walletId } },
        type: 'CREDIT',
        status: 'SUCCESS',
        amount,
        balanceBefore,
        balanceAfter,
        referenceType: MANUAL_TOP_UP.REFERENCE_TYPE,
        referenceId: bankReference,
        remarks: `Wallet top-up by bank transfer (ref ${bankReference})`,
        metadata: { recordedBy, receivedOn: receivedOn.toISOString().slice(0, 10) },
      },
    });
    return { transactionId: transaction.id, move: { balanceBefore, balanceAfter } as LedgerMove };
  }

  private asDomainError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return new ConflictException('Top-up', 'bank reference');
    return error;
  }
}
