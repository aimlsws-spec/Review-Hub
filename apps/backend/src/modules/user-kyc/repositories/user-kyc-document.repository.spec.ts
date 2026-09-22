import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { UserKycDocumentRepository } from './user-kyc-document.repository';

describe('UserKycDocumentRepository', () => {
  let repository: UserKycDocumentRepository;

  const mockPrisma = {
    userKycDocument: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserKycDocumentRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UserKycDocumentRepository>(UserKycDocumentRepository);
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should query non-deleted documents for the user, newest first', async () => {
      mockPrisma.userKycDocument.findMany.mockResolvedValue([{ id: 'doc-1' }]);

      const result = await repository.findByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.userKycDocument.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should query by id', async () => {
      mockPrisma.userKycDocument.findUnique.mockResolvedValue({ id: 'doc-1' });

      const result = await repository.findById('doc-1');

      expect(result).toEqual({ id: 'doc-1' });
      expect(mockPrisma.userKycDocument.findUnique).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });

  describe('findByUserAndType', () => {
    it('should query non-deleted documents by user and type, newest first', async () => {
      mockPrisma.userKycDocument.findFirst.mockResolvedValue({ id: 'doc-1' });

      const result = await repository.findByUserAndType('user-1', 'PAN' as never);

      expect(result).toEqual({ id: 'doc-1' });
      expect(mockPrisma.userKycDocument.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', documentType: 'PAN', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create a document', async () => {
      const data = { documentType: 'PAN', user: { connect: { id: 'user-1' } } };
      mockPrisma.userKycDocument.create.mockResolvedValue({ id: 'doc-1', ...data });

      const result = await repository.create(data as never);

      expect(result).toEqual({ id: 'doc-1', ...data });
      expect(mockPrisma.userKycDocument.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update a document by id', async () => {
      const data = { verificationStatus: 'APPROVED' };
      mockPrisma.userKycDocument.update.mockResolvedValue({ id: 'doc-1', ...data });

      const result = await repository.update('doc-1', data as never);

      expect(result).toEqual({ id: 'doc-1', ...data });
      expect(mockPrisma.userKycDocument.update).toHaveBeenCalledWith({ where: { id: 'doc-1' }, data });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on the document', async () => {
      mockPrisma.userKycDocument.update.mockResolvedValue({ id: 'doc-1', deletedAt: new Date() });

      await repository.softDelete('doc-1');

      expect(mockPrisma.userKycDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
  describe('review queries', () => {
    it('findManyForReview joins only safe user fields', async () => {
      mockPrisma.userKycDocument.findMany.mockResolvedValue([]);

      await repository.findManyForReview({ where: { deletedAt: null }, skip: 0, take: 10, orderBy: { createdAt: 'asc' } });

      expect(mockPrisma.userKycDocument.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
      });
    });

    it('findByIdForReview ignores soft-deleted documents', async () => {
      mockPrisma.userKycDocument.findFirst.mockResolvedValue({ id: 'doc-1' });

      await repository.findByIdForReview('doc-1');

      expect(mockPrisma.userKycDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'doc-1', deletedAt: null } }),
      );
    });

    it('decideIfReviewable only updates a document that is still waiting, in one statement', async () => {
      mockPrisma.userKycDocument.updateMany.mockResolvedValue({ count: 1 });
      const data = { verificationStatus: 'APPROVED' as const, verifiedBy: 'admin-1', verifiedAt: new Date() };

      const decided = await repository.decideIfReviewable('doc-1', data);

      expect(decided).toBe(true);
      expect(mockPrisma.userKycDocument.updateMany).toHaveBeenCalledWith({
        where: { id: 'doc-1', deletedAt: null, verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
        data,
      });
    });

    it('decideIfReviewable reports false when nothing matched, so the loser of a race is told', async () => {
      mockPrisma.userKycDocument.updateMany.mockResolvedValue({ count: 0 });

      const decided = await repository.decideIfReviewable('doc-1', {
        verificationStatus: 'REJECTED',
        verifiedBy: 'admin-1',
        verifiedAt: new Date(),
      });

      expect(decided).toBe(false);
    });
  });
});
