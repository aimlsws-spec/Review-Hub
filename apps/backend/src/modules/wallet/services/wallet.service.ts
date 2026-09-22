import { Injectable } from '@nestjs/common';

import { formatIstDateTime } from '@common/utils/date.util';

import { RewardQueryDto, WalletTransactionExportQueryDto, WalletTransactionQueryDto } from '../dto';
import { RewardRepository, UserWalletRepository } from '../repositories';
import { TRANSACTION_EXPORT_MAX_ROWS, buildTransactionFilter } from '../transaction-filter';

import { csvCell } from './tds-report.service';

/** Written first in a CSV so Excel opens it as UTF-8. Built from its code so no invisible character sits in the source. */
const UTF8_BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: UserWalletRepository,
    private readonly rewardRepository: RewardRepository,
  ) {}

  /** A wallet is created lazily on first access rather than at signup, so every user has one without a migration backfill. */
  async getWallet(userId: string) {
    const wallet = await this.walletRepository.getOrCreate(userId);
    const todayEarnings = await this.walletRepository.getTodayEarnings(wallet.id);
    return { ...wallet, todayEarnings };
  }

  async getTransactions(userId: string, query: WalletTransactionQueryDto) {
    const wallet = await this.walletRepository.getOrCreate(userId);
    return this.walletRepository.findTransactions(wallet.id, query.page, query.limit, buildTransactionFilter(query));
  }

  /**
   * The person's own wallet history as a spreadsheet, under the same filter as the list on screen. It is only ever
   * their own wallet, cut at a fixed number of rows, and says when it was cut.
   */
  async exportTransactionsCsv(userId: string, query: WalletTransactionExportQueryDto): Promise<{ filename: string; content: string; truncated: boolean }> {
    const filter = buildTransactionFilter(query);
    const wallet = await this.walletRepository.getOrCreate(userId);
    const rows = await this.walletRepository.findForExport(wallet.id, filter, TRANSACTION_EXPORT_MAX_ROWS);
    const truncated = rows.length > TRANSACTION_EXPORT_MAX_ROWS;

    const header = ['Date (IST)', 'Type', 'Status', 'Change (INR)', 'Balance after (INR)', 'Note'].map(csvCell);
    const lines = rows.slice(0, TRANSACTION_EXPORT_MAX_ROWS).map((row) => [
      csvCell(formatIstDateTime(row.createdAt)),
      csvCell(row.type),
      csvCell(row.status),
      // The two amounts are written as they are. csvCell would turn -100.25 into the text '-100.25, which a
      // spreadsheet can not add up, and these are made by the server, never typed by a person, so they need no
      // protection from being read as a formula. The change is signed by what happened to the balance, so money in
      // and out read correctly whatever the type is called.
      row.balanceAfter.minus(row.balanceBefore).toFixed(2),
      row.balanceAfter.toFixed(2),
      csvCell(row.remarks ?? ''),
    ]);
    const table = [header, ...lines].map((line) => line.join(',')).join('\r\n') + '\r\n';
    // The byte order mark lets Excel read the file as UTF-8, so notes in Hindi or Gujarati are not garbled.
    const content = UTF8_BYTE_ORDER_MARK + table;

    return { filename: `wallet-statement-${formatIstDateTime(new Date()).slice(0, 10)}.csv`, content, truncated };
  }

  async getMyRewards(userId: string, query: RewardQueryDto) {
    return this.rewardRepository.findByUser({
      userId,
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  }

  /** Rewards paid out to users across all of this merchant's campaigns. */
  async getMerchantRewards(merchantId: string, page: number, limit: number) {
    return this.rewardRepository.findByMerchant({ merchantId, page, limit });
  }

  /** MOCK feature to simulate adding funds. */
  async simulateAddFunds(userId: string, amount: number) {
    const wallet = await this.walletRepository.getOrCreate(userId);
    return this.walletRepository.creditAvailable({
      walletId: wallet.id,
      amount,
      type: 'CREDIT',
      remarks: 'Simulated Add Funds',
    });
  }
}
