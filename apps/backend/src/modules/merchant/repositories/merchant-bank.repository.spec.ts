import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BankDetailsProtector } from '../../../shared/crypto';
import { testBankDetailsProtector } from '../../../shared/crypto/testing';

import { MerchantBankRepository } from './merchant-bank.repository';

describe('MerchantBankRepository', () => {
  let repository: MerchantBankRepository;

  const protector = testBankDetailsProtector();
  const stored = { id: 'bank-1', merchantId: 'merchant-1', ...protector.seal({ accountNumber: '123456789012', upiId: 'shop@okicici' }) };

  const mockPrisma = {
    merchantBankAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantBankRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BankDetailsProtector, useValue: protector },
      ],
    }).compile();

    repository = module.get<MerchantBankRepository>(MerchantBankRepository);
    jest.clearAllMocks();
  });

  it('writes the number and UPI ID encrypted, and returns the new account masked', async () => {
    mockPrisma.merchantBankAccount.create.mockImplementation(({ data }) => Promise.resolve({ id: 'bank-1', ...data }));

    const created = await repository.create({
      merchantId: 'merchant-1',
      bankName: 'ICICI Bank',
      accountHolderName: 'Acme Foods',
      accountNumber: '123456789012',
      ifscCode: 'ICIC0001234',
      upiId: 'shop@okicici',
      isPrimary: true,
    });

    const written = mockPrisma.merchantBankAccount.create.mock.calls[0][0].data;
    expect(JSON.stringify(written)).not.toContain('123456789012');
    expect(JSON.stringify(written)).not.toContain('shop@okicici');
    expect(written.merchant).toEqual({ connect: { id: 'merchant-1' } });
    expect(created.accountNumber).toBe('XXXX9012');
  });

  it('returns accounts masked for the merchant, the primary one included', async () => {
    mockPrisma.merchantBankAccount.findMany.mockResolvedValue([stored]);
    mockPrisma.merchantBankAccount.findFirst.mockResolvedValue(stored);

    expect((await repository.findByMerchantId('merchant-1'))[0].accountNumber).toBe('XXXX9012');
    expect((await repository.findPrimary('merchant-1'))?.accountNumber).toBe('XXXX9012');
    expect(mockPrisma.merchantBankAccount.findMany).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-1', deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('reveals the real numbers only through the admin verification read', async () => {
    mockPrisma.merchantBankAccount.findMany.mockResolvedValue([stored]);

    const [account] = await repository.findByMerchantIdRevealed('merchant-1');

    expect(account.accountNumber).toBe('123456789012');
    expect(account.upiId).toBe('shop@okicici');
    expect(account).not.toHaveProperty('accountNumberHash');
  });

  it('returns null for an unknown account', async () => {
    mockPrisma.merchantBankAccount.findUnique.mockResolvedValue(null);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
