import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class MarketplaceItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; category?: string; isActive?: boolean }) {
    const { page, limit, category, isActive } = params;
    const where: Prisma.MarketplaceItemWhereInput = { deletedAt: null };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.marketplaceItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.marketplaceItem.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.marketplaceItem.findFirst({ where: { id, deletedAt: null } });
  }

  async create(data: Prisma.MarketplaceItemCreateInput) {
    return this.prisma.marketplaceItem.create({ data });
  }

  async update(id: string, data: Prisma.MarketplaceItemUpdateInput) {
    return this.prisma.marketplaceItem.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.marketplaceItem.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /**
   * Validated inside the transaction, not before it, so two concurrent
   * redemptions of the last unit can't both pass a stock check against the
   * same stale read. Unlimited-stock items (stock: null) are a no-op.
   * Returns whether stock was actually tracked/decremented, so the caller
   * knows whether a compensating `incrementStock` is meaningful later.
   */
  async decrementStockIfTracked(itemId: string): Promise<boolean> {
    return this.prisma.transaction(async (tx) => {
      const item = await tx.marketplaceItem.findUniqueOrThrow({ where: { id: itemId } });
      if (item.stock === null) return false;
      if (item.stock <= 0) throw new BadRequestException('This item is out of stock');

      await tx.marketplaceItem.update({ where: { id: itemId }, data: { stock: { decrement: 1 } } });
      return true;
    });
  }

  /** Compensates a stock decrement when a later step (the wallet debit) fails after stock was already reserved. */
  async incrementStock(itemId: string): Promise<void> {
    await this.prisma.marketplaceItem.update({ where: { id: itemId }, data: { stock: { increment: 1 } } });
  }
}
