import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.notificationTemplate.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    return this.prisma.notificationTemplate.findFirst({ where: { id, deletedAt: null } });
  }

  /** Includes soft-deleted rows on purpose: the slug column is unique across all of them. */
  async slugExists(slug: string): Promise<boolean> {
    return (await this.prisma.notificationTemplate.count({ where: { slug } })) > 0;
  }

  async create(data: Prisma.NotificationTemplateCreateInput) {
    return this.prisma.notificationTemplate.create({ data });
  }

  async update(id: string, data: Prisma.NotificationTemplateUpdateInput) {
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.notificationTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
