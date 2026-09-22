import { Prisma, WalletTransactionType } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';
import { parseIstDay } from '@common/utils/date.util';

/** Most rows a downloaded statement holds. Beyond it the file is cut and says so, so one request can not be made to read a whole table. */
export const TRANSACTION_EXPORT_MAX_ROWS = 5000;

/** The longest span a filter or a download may cover. */
export const TRANSACTION_MAX_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What a person can narrow their wallet history by. */
export interface TransactionFilter {
  type?: WalletTransactionType;
  /** Start of the first day asked for, inclusive. */
  createdFrom?: Date;
  /** Start of the day after the last one asked for, so the last day is included whole. */
  createdBefore?: Date;
  search?: string;
}

/**
 * Turns the dates the app sends (India days, "2026-09-01") into an instant range, and checks them: real calendar
 * dates, the start not after the end, and not more than a year apart. One date on its own is fine, and means
 * "from then on" or "up to then".
 */
export function buildTransactionFilter(query: { type?: WalletTransactionType; from?: string; to?: string; search?: string }): TransactionFilter {
  const filter: TransactionFilter = {};
  if (query.type) filter.type = query.type;
  const search = query.search?.trim();
  if (search) filter.search = search;

  const from = query.from ? parseIstDay(query.from) : null;
  const to = query.to ? parseIstDay(query.to) : null;
  if (query.from && !from) throw new BadRequestException('from is not a real date');
  if (query.to && !to) throw new BadRequestException('to is not a real date');
  if (from && to && from.getTime() > to.getTime()) throw new BadRequestException('from can not be after to');
  if (from && to && (to.getTime() - from.getTime()) / DAY_MS >= TRANSACTION_MAX_RANGE_DAYS) {
    throw new BadRequestException(`Choose a period of at most ${TRANSACTION_MAX_RANGE_DAYS} days`);
  }

  if (from) filter.createdFrom = from;
  if (to) filter.createdBefore = new Date(to.getTime() + DAY_MS);
  return filter;
}

/** The database condition for one wallet's history under a filter. Always tied to the wallet, so it can never reach anyone else's. */
export function transactionWhere(walletId: string, filter: TransactionFilter): Prisma.WalletTransactionWhereInput {
  const where: Prisma.WalletTransactionWhereInput = { walletId };
  if (filter.type) where.type = filter.type;
  if (filter.createdFrom || filter.createdBefore) {
    where.createdAt = { ...(filter.createdFrom ? { gte: filter.createdFrom } : {}), ...(filter.createdBefore ? { lt: filter.createdBefore } : {}) };
  }
  if (filter.search) where.remarks = { contains: filter.search };
  return where;
}
