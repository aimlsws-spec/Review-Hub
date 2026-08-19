import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class UserBankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.userBankAccount.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.userBankAccount.findUnique({ where: { id } });
  }

  async countByUserId(userId: string) {
    return this.prisma.userBankAccount.count({ where: { userId, deletedAt: null } });
  }

  async create(data: Prisma.UserBankAccountCreateInput) {
    return this.prisma.userBankAccount.create({ data });
  }

  async update(id: string, data: Prisma.UserBankAccountUpdateInput) {
    return this.prisma.userBankAccount.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.userBankAccount.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async unsetPrimaryForUser(userId: string, excludeId?: string) {
    const where: Prisma.UserBankAccountWhereInput = { userId, isPrimary: true, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.userBankAccount.updateMany({ where, data: { isPrimary: false } });
  }
}
