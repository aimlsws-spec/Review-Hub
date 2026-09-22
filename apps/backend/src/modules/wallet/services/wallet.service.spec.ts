import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { RewardRepository, UserWalletRepository } from '../repositories';

import { WalletService } from './wallet.service';

/** The byte order mark at the start of a CSV that Excel reads as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

describe('WalletService', () => {
  let service: WalletService;

  const mockWalletRepository = {
    getOrCreate: jest.fn(),
    findTransactions: jest.fn(),
    findForExport: jest.fn(),
    getTodayEarnings: jest.fn(),
  };
  const mockRewardRepository = {
    findByUser: jest.fn(),
    findByMerchant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: UserWalletRepository, useValue: mockWalletRepository },
        { provide: RewardRepository, useValue: mockRewardRepository },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should get or create a wallet for the user', async () => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1', availableBalance: 0 });
      mockWalletRepository.getTodayEarnings.mockResolvedValue(0);

      const result = await service.getWallet('user-1');
      expect(result).toHaveProperty('id', 'wallet-1');
      expect(result).toHaveProperty('todayEarnings', 0);
      expect(mockWalletRepository.getOrCreate).toHaveBeenCalledWith('user-1');
      expect(mockWalletRepository.getTodayEarnings).toHaveBeenCalledWith('wallet-1');
    });
  });

  describe('getTransactions', () => {
    it('should resolve the wallet then fetch its transactions', async () => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockWalletRepository.findTransactions.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getTransactions('user-1', { page: 1, limit: 20 } as never);
      expect(mockWalletRepository.findTransactions).toHaveBeenCalledWith('wallet-1', 1, 20, {});
    });
  });

  describe('getTransactions, filtered', () => {
    it('turns the person’s filter into what the repository is asked, always for their own wallet', async () => {
      mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' });
      mockWalletRepository.findTransactions.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 });

      await service.getTransactions('user-1', { page: 2, limit: 10, type: 'WITHDRAWAL', from: '2026-09-01', to: '2026-09-30', search: ' cafe ' } as never);

      const [walletId, page, limit, filter] = mockWalletRepository.findTransactions.mock.calls[0];
      expect([walletId, page, limit]).toEqual(['wallet-1', 2, 10]);
      expect(filter).toMatchObject({ type: 'WITHDRAWAL', search: 'cafe' });
      expect(filter.createdFrom.toISOString()).toBe('2026-08-31T18:30:00.000Z');
      expect(filter.createdBefore.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    });

    it('refuses a period that makes no sense, before reading anything', async () => {
      await expect(service.getTransactions('user-1', { page: 1, limit: 20, from: '2026-09-30', to: '2026-09-01' } as never)).rejects.toBeInstanceOf(BadRequestException);
      expect(mockWalletRepository.findTransactions).not.toHaveBeenCalled();
    });
  });

  describe('exportTransactionsCsv', () => {
    const row = (overrides: Record<string, unknown> = {}) => ({
      createdAt: new Date('2026-09-21T08:35:00Z'),
      type: 'CREDIT',
      status: 'SUCCESS',
      balanceBefore: new Prisma.Decimal('100.00'),
      balanceAfter: new Prisma.Decimal('150.50'),
      remarks: 'Reward for a review',
      ...overrides,
    });

    beforeEach(() => mockWalletRepository.getOrCreate.mockResolvedValue({ id: 'wallet-1' }));

    it('writes a header and one line per transaction, in India time, with the change signed by what happened to the balance', async () => {
      mockWalletRepository.findForExport.mockResolvedValue([
        row(),
        row({ type: 'WITHDRAWAL', balanceBefore: new Prisma.Decimal('150.50'), balanceAfter: new Prisma.Decimal('50.25'), remarks: null, createdAt: new Date('2026-09-20T18:31:00Z') }),
      ]);

      const { content, truncated } = await service.exportTransactionsCsv('user-1', {});

      const lines = content.replace(BOM, '').trimEnd().split('\r\n');
      expect(lines).toEqual([
        'Date (IST),Type,Status,Change (INR),Balance after (INR),Note',
        '2026-09-21 14:05,CREDIT,SUCCESS,50.50,150.50,Reward for a review',
        '2026-09-21 00:01,WITHDRAWAL,SUCCESS,-100.25,50.25,',
      ]);
      expect(truncated).toBe(false);
    });

    it('starts with a byte order mark so Excel reads notes in Hindi or Gujarati correctly', async () => {
      mockWalletRepository.findForExport.mockResolvedValue([row({ remarks: 'समीक्षा ઇનામ' })]);

      const { content } = await service.exportTransactionsCsv('user-1', {});

      expect(content.startsWith(BOM)).toBe(true);
      expect(content).toContain('समीक्षा ઇનામ');
    });

    it('does not let a note be run as a formula, and quotes one with a comma', async () => {
      mockWalletRepository.findForExport.mockResolvedValue([row({ remarks: '=HYPERLINK("http://evil.example")' }), row({ remarks: 'Paid, thanks' })]);

      const { content } = await service.exportTransactionsCsv('user-1', {});

      expect(content).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
      expect(content).toContain('"Paid, thanks"');
      expect(content).not.toMatch(/,=HYPERLINK/);
    });

    it('cuts a very long history at the limit, and says so, so a partial statement is not taken for a whole one', async () => {
      mockWalletRepository.findForExport.mockResolvedValue(Array.from({ length: 5001 }, () => row()));

      const { content, truncated } = await service.exportTransactionsCsv('user-1', {});

      expect(truncated).toBe(true);
      expect(content.trimEnd().split('\r\n')).toHaveLength(5001); // the header and 5000 rows
    });

    it('reads only the caller’s own wallet, under the same filter as the list', async () => {
      mockWalletRepository.findForExport.mockResolvedValue([]);

      await service.exportTransactionsCsv('user-1', { type: 'CREDIT', from: '2026-09-01' });

      expect(mockWalletRepository.getOrCreate).toHaveBeenCalledWith('user-1');
      const [walletId, filter, limit] = mockWalletRepository.findForExport.mock.calls[0];
      expect(walletId).toBe('wallet-1');
      expect(filter).toMatchObject({ type: 'CREDIT' });
      expect(limit).toBe(5000);
    });

    it('is a header only for an empty history, and names the file by today’s date', async () => {
      mockWalletRepository.findForExport.mockResolvedValue([]);

      const { content, filename } = await service.exportTransactionsCsv('user-1', {});

      expect(content.trimEnd().split('\r\n')).toHaveLength(1);
      expect(filename).toMatch(/^wallet-statement-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('refuses a bad period before reading anything', async () => {
      await expect(service.exportTransactionsCsv('user-1', { from: '2026-02-31' })).rejects.toBeInstanceOf(BadRequestException);
      expect(mockWalletRepository.findForExport).not.toHaveBeenCalled();
    });
  });

  describe('getMyRewards', () => {
    it('should list rewards scoped to the user', async () => {
      mockRewardRepository.findByUser.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getMyRewards('user-1', { page: 1, limit: 20 } as never);
      expect(mockRewardRepository.findByUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  describe('getMerchantRewards', () => {
    it('should delegate to the repository scoped by merchant', async () => {
      mockRewardRepository.findByMerchant.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.getMerchantRewards('merchant-1', 1, 20);
      expect(mockRewardRepository.findByMerchant).toHaveBeenCalledWith({ merchantId: 'merchant-1', page: 1, limit: 20 });
    });
  });
});
