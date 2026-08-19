import { Injectable } from '@nestjs/common';
import { Prisma, ReviewSource, ReviewStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface ReviewQueryParams {
  merchantId: string;
  page: number;
  limit: number;
  source?: ReviewSource;
  rating?: number;
  status?: ReviewStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ReviewCreateInput) {
    return this.prisma.review.create({ data });
  }

  async findById(id: string) {
    return this.prisma.review.findFirst({ where: { id, deletedAt: null } });
  }

  async update(id: string, data: Prisma.ReviewUpdateInput) {
    return this.prisma.review.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.review.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findByMerchant(params: ReviewQueryParams) {
    const { merchantId, page, limit, source, rating, status, search, dateFrom, dateTo, sort = 'newest' } = params;

    const where: Prisma.ReviewWhereInput = { merchantId, deletedAt: null };
    if (source) where.source = source;
    if (rating) where.rating = rating;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { title: { contains: search } },
        { body: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.reviewedAt = {};
      if (dateFrom) where.reviewedAt.gte = dateFrom;
      if (dateTo) where.reviewedAt.lte = dateTo;
    }

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      sort === 'oldest' ? { reviewedAt: 'asc' } :
      sort === 'highest' ? { rating: 'desc' } :
      sort === 'lowest' ? { rating: 'asc' } :
      { reviewedAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.review.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getStats(merchantId: string) {
    const where: Prisma.ReviewWhereInput = { merchantId, deletedAt: null };

    const [total, avgRating, repliedCount, pendingCount] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
      this.prisma.review.count({ where: { ...where, status: 'REPLIED' } }),
      this.prisma.review.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    return {
      total,
      averageRating: avgRating._avg.rating ?? 0,
      repliedCount,
      pendingCount,
      responseRate: total > 0 ? repliedCount / total : 0,
    };
  }
}
