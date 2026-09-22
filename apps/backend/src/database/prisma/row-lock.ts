import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Row locks for money.
 *
 * WHY: a wallet change reads the balance and then writes a new one. Under MySQL's default isolation level nothing stops
 * two requests reading the same balance at the same moment, and then both writing. Three simultaneous withdrawals of
 * 2,000 against a balance of 3,000 all passed the check and all went through, leaving 6,000 held from a wallet that
 * only ever had 3,000. `SELECT ... FOR UPDATE` makes the second request wait until the first has finished, so each one
 * reads the balance the previous one left.
 *
 * Call these as the first thing inside `prisma.transaction(...)`, before reading the balance. The lock is released
 * automatically when the transaction commits or rolls back.
 *
 * To stay clear of deadlocks, whenever a method needs more than one of these it takes them in this order:
 * transaction row or withdrawal, then campaign, then wallet. Keep to that order in any new code.
 *
 * Take every lock BEFORE the first ordinary read in the transaction. The first ordinary read fixes what the rest of the
 * transaction can see; a lock taken after it can wait for another transaction to finish and then still read the old
 * balance, and the update that follows would write over that transaction's change.
 */

/** An invoice, so two credit notes issued at once can not each be checked against the same remaining value. */
export async function lockInvoice(tx: Tx, invoiceId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
}

/** A withdrawal request, so two admins (or an admin and the gateway) can not settle the same one twice. */
export async function lockWithdrawal(tx: Tx, withdrawalId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM withdrawal_requests WHERE id = ${withdrawalId} FOR UPDATE`;
}

/**
 * A withdrawal request and then its wallet, in that order, returning the wallet's id (null if there is no such withdrawal).
 * Both are taken before anything is read, which is why this reads the wallet id with the lock itself.
 */
export async function lockWithdrawalAndWallet(tx: Tx, withdrawalId: string): Promise<string | null> {
  const rows = await tx.$queryRaw<{ walletId: string }[]>`SELECT walletId FROM withdrawal_requests WHERE id = ${withdrawalId} FOR UPDATE`;
  const walletId = rows[0]?.walletId ?? null;
  if (walletId) await lockUserWallet(tx, walletId);
  return walletId;
}

/** A user's wallet. */
export async function lockUserWallet(tx: Tx, walletId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM user_wallets WHERE id = ${walletId} FOR UPDATE`;
}

/** A merchant's wallet, when the wallet id is known. */
export async function lockMerchantWalletById(tx: Tx, merchantWalletId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM merchant_wallets WHERE id = ${merchantWalletId} FOR UPDATE`;
}

/** A merchant's wallet, when only the merchant is known. */
export async function lockMerchantWalletByMerchant(tx: Tx, merchantId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM merchant_wallets WHERE merchantId = ${merchantId} FOR UPDATE`;
}

/** A campaign, whose budget counters change alongside the merchant wallet. */
export async function lockCampaign(tx: Tx, campaignId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;
}

/** A ledger entry, so two confirmations of the same payment can not both credit it. */
export async function lockWalletTransaction(tx: Tx, transactionId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM wallet_transactions WHERE id = ${transactionId} FOR UPDATE`;
}

/**
 * A bank-transfer top-up and then the merchant wallet it belongs to, in that order, before anything is read. Returns
 * the wallet's id (null if there is no such top-up).
 */
export async function lockManualTopUpAndWallet(tx: Tx, topUpId: string): Promise<string | null> {
  const rows = await tx.$queryRaw<{ merchantWalletId: string }[]>`SELECT merchantWalletId FROM merchant_manual_top_ups WHERE id = ${topUpId} FOR UPDATE`;
  const walletId = rows[0]?.merchantWalletId ?? null;
  if (walletId) await lockMerchantWalletById(tx, walletId);
  return walletId;
}
