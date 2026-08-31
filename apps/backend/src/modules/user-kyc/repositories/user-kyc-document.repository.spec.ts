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
});
