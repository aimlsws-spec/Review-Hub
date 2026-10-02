import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BankDetailsProtector } from '../../../shared/crypto';
import { testBankDetailsProtector } from '../../../shared/crypto/testing';

import { UserBankAccountRepository } from './user-bank-account.repository';

describe('UserBankAccountRepository', () => {
  let repository: UserBankAccountRepository;

  const mockPrisma = {
    userBankAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBankAccountRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BankDetailsProtector, useValue: testBankDetailsProtector() },
      ],
    }).compile();

    repository = module.get<UserBankAccountRepository>(UserBankAccountRepository);
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should order primary accounts first', async () => {
      mockPrisma.userBankAccount.findMany.mockResolvedValue([{ id: 'bank-1', accountNumber: '123456789012', upiId: null }]);

      const result = await repository.findByUserId('user-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.userBankAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('unsetPrimaryForUser', () => {
    it('should exclude the given id when provided', async () => {
      mockPrisma.userBankAccount.updateMany.mockResolvedValue({ count: 1 });

      await repository.unsetPrimaryForUser('user-1', 'bank-2');
      expect(mockPrisma.userBankAccount.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPrimary: true, deletedAt: null, id: { not: 'bank-2' } },
        data: { isPrimary: false },
      });
    });
  });

  describe('encryption', () => {
    const protector = testBankDetailsProtector();
    const stored = { id: 'bank-1', userId: 'user-1', ...protector.seal({ accountNumber: '123456789012', upiId: 'jane@okhdfc' }) };

    it('writes the number and UPI ID encrypted, never as typed, and returns them masked', async () => {
      mockPrisma.userBankAccount.create.mockImplementation(({ data }) => Promise.resolve({ id: 'bank-1', ...data }));

      const created = await repository.create({
        userId: 'user-1',
        bankName: 'HDFC Bank',
        accountHolderName: 'Jane Doe',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        upiId: 'jane@okhdfc',
        isPrimary: true,
      });

      const written = mockPrisma.userBankAccount.create.mock.calls[0][0].data;
      expect(JSON.stringify(written)).not.toContain('123456789012');
      expect(JSON.stringify(written)).not.toContain('jane@okhdfc');
      expect(written).toEqual(expect.objectContaining({ accountNumberLast4: '9012', accountNumberHash: protector.hashAccountNumber('123456789012') }));
      expect(written.user).toEqual({ connect: { id: 'user-1' } });
      expect(created.accountNumber).toBe('XXXX9012');
      expect(created).not.toHaveProperty('accountNumberHash');
    });

    it('returns every account masked', async () => {
      mockPrisma.userBankAccount.findMany.mockResolvedValue([stored]);
      mockPrisma.userBankAccount.findUnique.mockResolvedValue(stored);

      expect((await repository.findByUserId('user-1'))[0].accountNumber).toBe('XXXX9012');
      expect((await repository.findById('bank-1'))?.accountNumber).toBe('XXXX9012');
      expect((await repository.findById('bank-1'))?.upiId).toBe('jane@okhdfc');
    });

    it('encrypts a changed UPI ID, and leaves it alone when it is not part of the change', async () => {
      mockPrisma.userBankAccount.update.mockResolvedValue(stored);

      await repository.update('bank-1', { upiId: 'new@okicici' });
      await repository.update('bank-1', { bankName: 'ICICI Bank' });

      const [first, second] = mockPrisma.userBankAccount.update.mock.calls.map((c) => c[0].data);
      expect(first.upiId).toMatch(/^enc:v1:/);
      expect(second).toEqual({ bankName: 'ICICI Bank' });
    });
  });
});
