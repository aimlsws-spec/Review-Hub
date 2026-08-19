import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { CreateReviewDto, ReplyReviewDto, ReviewQueryDto, UpdateReviewStatusDto } from '../dto';
import { ReviewRepository } from '../repositories';

@Injectable()
export class ReviewService {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async list(merchantId: string, query: ReviewQueryDto) {
    return this.reviewRepository.findByMerchant({
      merchantId,
      page: query.page,
      limit: query.limit,
      source: query.source,
      rating: query.rating,
      status: query.status,
      search: query.search,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      sort: query.sort,
    });
  }

  async getStats(merchantId: string) {
    return this.reviewRepository.getStats(merchantId);
  }

  async getOne(merchantId: string, reviewId: string) {
    const review = await this.getOwnedReview(merchantId, reviewId);
    return review;
  }

  async create(merchantId: string, dto: CreateReviewDto) {
    return this.reviewRepository.create({
      merchant: { connect: { id: merchantId } },
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      source: dto.source,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      reviewedAt: dto.reviewedAt ? new Date(dto.reviewedAt) : new Date(),
    });
  }

  async reply(merchantId: string, reviewId: string, dto: ReplyReviewDto, repliedByUserId: string) {
    await this.getOwnedReview(merchantId, reviewId);
    return this.reviewRepository.update(reviewId, {
      reply: dto.reply,
      repliedAt: new Date(),
      repliedBy: repliedByUserId,
      status: 'REPLIED',
    });
  }

  async updateStatus(merchantId: string, reviewId: string, dto: UpdateReviewStatusDto) {
    await this.getOwnedReview(merchantId, reviewId);
    return this.reviewRepository.update(reviewId, { status: dto.status });
  }

  async delete(merchantId: string, reviewId: string) {
    await this.getOwnedReview(merchantId, reviewId);
    await this.reviewRepository.softDelete(reviewId);
  }

  private async getOwnedReview(merchantId: string, reviewId: string) {
    const review = await this.reviewRepository.findById(reviewId);
    // A review belonging to a different merchant is reported as not found, not
    // forbidden, so ids can't be used to probe for other merchants' reviews.
    if (!review || review.merchantId !== merchantId) {
      throw new NotFoundException('Review');
    }
    return review;
  }
}
