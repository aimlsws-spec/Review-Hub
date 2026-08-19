import { Injectable } from '@nestjs/common';
import { OtpType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestByUserAndType(userId: string, type: OtpType) {
    return this.prisma.otp.findFirst({
      where: { userId, type, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.OtpCreateInput) {
    return this.prisma.otp.create({ data });
  }

  async markVerified(id: string) {
    return this.prisma.otp.update({ where: { id }, data: { status: 'VERIFIED', verifiedAt: new Date() } });
  }

  async markExpired(id: string) {
    return this.prisma.otp.update({ where: { id }, data: { status: 'EXPIRED' } });
  }

  async markExhausted(id: string) {
    return this.prisma.otp.update({ where: { id }, data: { status: 'EXHAUSTED' } });
  }

  async incrementAttempts(id: string) {
    return this.prisma.otp.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async expireAllByUserAndType(userId: string, type: OtpType) {
    return this.prisma.otp.updateMany({
      where: { userId, type, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
  }

  async findById(id: string) {
    return this.prisma.otp.findUnique({ where: { id } });
  }

  async deleteExpiredBefore(date: Date) {
    return this.prisma.otp.deleteMany({
      where: { expiresAt: { lt: date }, status: { in: ['EXPIRED', 'VERIFIED', 'EXHAUSTED'] } },
    });
  }

  async countExpiredBefore(date: Date) {
    return this.prisma.otp.count({
      where: { expiresAt: { lt: date }, status: { in: ['EXPIRED', 'VERIFIED', 'EXHAUSTED'] } },
    });
  }
}
