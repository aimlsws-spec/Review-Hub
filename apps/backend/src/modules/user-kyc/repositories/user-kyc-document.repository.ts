import { Injectable } from '@nestjs/common';
import { Prisma, UserDocumentType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class UserKycDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.userKycDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.userKycDocument.findUnique({ where: { id } });
  }

  async findByUserAndType(userId: string, documentType: UserDocumentType) {
    return this.prisma.userKycDocument.findFirst({
      where: { userId, documentType, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.UserKycDocumentCreateInput) {
    return this.prisma.userKycDocument.create({ data });
  }

  async update(id: string, data: Prisma.UserKycDocumentUpdateInput) {
    return this.prisma.userKycDocument.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.userKycDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
