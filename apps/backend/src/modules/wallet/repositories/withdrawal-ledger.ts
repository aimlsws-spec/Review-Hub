import { Prisma } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { lockUserWallet } from '../../../database/prisma/row-lock';

type Tx = Prisma.TransactionClient;

interface LedgerParams {
  walletId: string;
  amount: number;
  withdrawalId: string;
}

/**
 * The four ledger movements a withdrawal goes through, each written to run inside a transaction the caller already
 * has open. That is what lets a status change and its ledger entry succeed or fail together: a withdrawal can never
 * be marked approved without the money having moved, or the money move without the status changing.
 *
 * Every one takes the wallet lock first (a lock already held by the same transaction is not a problem).
 */

/** Available to locked, when a withdrawal is requested. Refuses when the wallet does not hold the amount. */
export async function holdInTx(tx: Tx, { walletId, amount, withdrawalId }: LedgerParams) {
  await lockUserWallet(tx, walletId);
  const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
  if (Number(wallet.availableBalance) < amount) {
    throw new BadRequestException('Insufficient wallet balance');
  }

  const balanceBefore = wallet.availableBalance;
  const availableAfter = Number(balanceBefore) - amount;

  await tx.userWallet.update({
    where: { id: walletId },
    data: { availableBalance: availableAfter, lockedBalance: { increment: amount } },
  });

  return tx.walletTransaction.create({
    data: {
      wallet: { connect: { id: walletId } },
      type: 'HOLD',
      status: 'SUCCESS',
      amount,
      balanceBefore,
      balanceAfter: availableAfter,
      referenceType: 'WithdrawalRequest',
      referenceId: withdrawalId,
    },
  });
}

/** Locked back to available: a rejected or cancelled withdrawal. */
export async function releaseInTx(tx: Tx, { walletId, amount, withdrawalId }: LedgerParams) {
  await lockUserWallet(tx, walletId);
  const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
  const balanceBefore = wallet.availableBalance;
  const balanceAfter = Number(balanceBefore) + amount;

  await tx.userWallet.update({
    where: { id: walletId },
    data: { availableBalance: balanceAfter, lockedBalance: { decrement: amount } },
  });

  return tx.walletTransaction.create({
    data: {
      wallet: { connect: { id: walletId } },
      type: 'RELEASE',
      status: 'SUCCESS',
      amount,
      balanceBefore,
      balanceAfter,
      referenceType: 'WithdrawalRequest',
      referenceId: withdrawalId,
    },
  });
}

/** Locked to withdrawn, for good: an approved withdrawal moving toward payout. */
export async function finalizeInTx(tx: Tx, { walletId, amount, withdrawalId }: LedgerParams) {
  await lockUserWallet(tx, walletId);
  const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
  const balanceBefore = wallet.lockedBalance;
  const lockedAfter = Number(balanceBefore) - amount;

  await tx.userWallet.update({
    where: { id: walletId },
    data: { lockedBalance: lockedAfter, totalWithdrawn: { increment: amount } },
  });

  return tx.walletTransaction.create({
    data: {
      wallet: { connect: { id: walletId } },
      type: 'WITHDRAWAL',
      status: 'SUCCESS',
      amount,
      balanceBefore,
      balanceAfter: lockedAfter,
      referenceType: 'WithdrawalRequest',
      referenceId: withdrawalId,
    },
  });
}

/** Withdrawn back to available: the payout failed, or was reversed, after the money had left. */
export async function reverseInTx(tx: Tx, { walletId, amount, withdrawalId }: LedgerParams, remarks: string) {
  await lockUserWallet(tx, walletId);
  const wallet = await tx.userWallet.findUniqueOrThrow({ where: { id: walletId } });
  const balanceBefore = wallet.availableBalance;
  const balanceAfter = Number(balanceBefore) + amount;

  await tx.userWallet.update({
    where: { id: walletId },
    data: { availableBalance: balanceAfter, totalWithdrawn: { decrement: amount } },
  });

  return tx.walletTransaction.create({
    data: {
      wallet: { connect: { id: walletId } },
      type: 'REFUND',
      status: 'SUCCESS',
      amount,
      balanceBefore,
      balanceAfter,
      referenceType: 'WithdrawalRequest',
      referenceId: withdrawalId,
      remarks,
    },
  });
}
