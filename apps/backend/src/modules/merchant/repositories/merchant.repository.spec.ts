import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { MerchantRepository } from './merchant.repository';

describe('MerchantRepository', () => {
  let repository: MerchantRepository;

  const mockPrisma = {
    merchant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    merchantSubscription: { count: jest.fn() },
    merchantDocument: { updateMany: jest.fn() },
    merchantBankAccount: { updateMany: jest.fn() },
    transaction: jest.fn(),
  };
  // The transaction runs its callback against the same mock, standing in for the transaction client.
  mockPrisma.transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<MerchantRepository>(MerchantRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should call prisma with correct args', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1' });

      const result = await repository.findById('merchant-1');
      expect(result).toEqual({ id: 'merchant-1' });
      expect(mockPrisma.merchant.findUnique).toHaveBeenCalledWith({
        where: { id: 'merchant-1' },
        include: { country: true, state: true, city: true, wallet: true },
      });
    });
  });

  describe('findByEmail', () => {
    it('should find merchant by email', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'merchant-1', email: 'test@test.com' });

      const result = await repository.findByEmail('test@test.com');
      expect(result).toHaveProperty('email', 'test@test.com');
    });
  });

  describe('create', () => {
    it('should create a merchant', async () => {
      const data = { businessName: 'Acme Corp', email: 'test@test.com', phone: '+911234567890' };
      mockPrisma.merchant.create.mockResolvedValue({ id: 'new-id', ...data });

      const result = await repository.create(data as never);
      expect(result).toHaveProperty('id', 'new-id');
    });
  });

  describe('findWithFilters', () => {
    it('should return paginated results', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: 'merchant-1' }]);
      mockPrisma.merchant.count.mockResolvedValue(1);

      const result = await repository.findWithFilters({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      mockPrisma.merchant.count.mockResolvedValue(0);

      await repository.findWithFilters({ page: 1, limit: 20, status: 'ACTIVE' });
      expect(mockPrisma.merchant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  describe('findVerificationFacts', () => {
    it('reads what the verification level needs', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        verificationStatus: 'APPROVED',
        user: { phoneVerifiedAt: new Date(), emailVerifiedAt: null },
      });
      mockPrisma.merchantSubscription.count.mockResolvedValue(1);

      await expect(repository.findVerificationFacts('merchant-1')).resolves.toEqual({
        phoneVerified: true,
        emailVerified: false,
        businessVerified: true,
        premium: true,
      });
      expect(mockPrisma.merchantSubscription.count).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1', status: 'ACTIVE', plan: { isPremium: true } },
      });
    });

    it('returns null for an unknown merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(repository.findVerificationFacts('nope')).resolves.toBeNull();
    });
  });
  describe('approveWithDetails', () => {
    it('approves the merchant and only the documents and bank accounts still waiting, in one transaction', async () => {
      mockPrisma.merchant.update.mockResolvedValue({ id: 'merchant-1', status: 'ACTIVE' });
      mockPrisma.merchantDocument.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.merchantBankAccount.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.approveWithDetails('merchant-1', 'admin-1');

      expect(mockPrisma.transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: 'merchant-1' },
        data: expect.objectContaining({ status: 'ACTIVE', verificationStatus: 'APPROVED', verifiedBy: 'admin-1' }),
      });
      expect(mockPrisma.merchantDocument.updateMany).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1', deletedAt: null, verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: expect.objectContaining({ verificationStatus: 'APPROVED', verifiedBy: 'admin-1', rejectionReason: null }),
      });
      expect(mockPrisma.merchantBankAccount.updateMany).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1', deletedAt: null, verificationStatus: 'PENDING' },
        data: expect.objectContaining({ verificationStatus: 'VERIFIED' }),
      });
      expect(result).toEqual({
        merchant: { id: 'merchant-1', status: 'ACTIVE' },
        documentsApproved: 2,
        bankAccountsVerified: 1,
      });
    });
  });

  describe('rejectWithDocuments', () => {
    it('rejects the merchant and the waiting documents with the reason, and leaves bank accounts alone', async () => {
      mockPrisma.merchant.update.mockResolvedValue({ id: 'merchant-1', status: 'SUSPENDED' });
      mockPrisma.merchantDocument.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.rejectWithDocuments('merchant-1', 'PAN does not match');

      expect(mockPrisma.transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: 'merchant-1' },
        data: { status: 'SUSPENDED', verificationStatus: 'REJECTED' },
      });
      expect(mockPrisma.merchantDocument.updateMany).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1', deletedAt: null, verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data: { verificationStatus: 'REJECTED', rejectionReason: 'PAN does not match' },
      });
      expect(mockPrisma.merchantBankAccount.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ merchant: { id: 'merchant-1', status: 'SUSPENDED' }, documentsRejected: 1 });
    });
  });
});
