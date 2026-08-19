import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { OtpRepository } from './otp.repository';

describe('OtpRepository', () => {
  let repository: OtpRepository;

  const mockPrisma = {
    otp: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<OtpRepository>(OtpRepository);

    jest.clearAllMocks();
  });

  describe('findLatestByUserAndType', () => {
    it('should find the latest pending OTP for user and type', async () => {
      const otp = { id: 'otp-1', userId: 'user-1', type: 'REGISTRATION', status: 'PENDING' };
      mockPrisma.otp.findFirst.mockResolvedValue(otp);

      const result = await repository.findLatestByUserAndType('user-1', 'REGISTRATION' as import('@prisma/client').OtpType);

      expect(result).toEqual(otp);
      expect(mockPrisma.otp.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'REGISTRATION', status: 'PENDING', expiresAt: { gt: expect.any(Date) } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create an OTP entry', async () => {
      const data = {
        user: { connect: { id: 'user-1' } },
        type: 'REGISTRATION' as import('@prisma/client').OtpType,
        code: '123456',
        maxAttempts: 5,
        expiresAt: new Date(),
      };
      mockPrisma.otp.create.mockResolvedValue({ id: 'otp-1', ...data });

      const result = await repository.create(data);

      expect(result).toHaveProperty('id', 'otp-1');
    });
  });

  describe('markVerified', () => {
    it('should mark OTP as verified', async () => {
      await repository.markVerified('otp-1');

      expect(mockPrisma.otp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { status: 'VERIFIED', verifiedAt: expect.any(Date) },
      });
    });
  });

  describe('markExpired', () => {
    it('should mark OTP as expired', async () => {
      await repository.markExpired('otp-1');

      expect(mockPrisma.otp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('incrementAttempts', () => {
    it('should increment attempts', async () => {
      await repository.incrementAttempts('otp-1');

      expect(mockPrisma.otp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
    });
  });
});
