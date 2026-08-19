import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { ReviewRepository } from '../repositories';

import { ReviewService } from './review.service';

describe('ReviewService', () => {
  let service: ReviewService;

  const mockReviewRepository = {
    findByMerchant: jest.fn(),
    getStats: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockReview = {
    id: 'review-1',
    merchantId: 'merchant-1',
    customerName: 'Priya Sharma',
    customerEmail: 'priya@example.com',
    source: 'GOOGLE',
    rating: 5,
    title: 'Great',
    body: 'Loved it',
    status: 'PENDING',
    reply: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewService, { provide: ReviewRepository, useValue: mockReviewRepository }],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('forwards filters to the repository', async () => {
      mockReviewRepository.findByMerchant.mockResolvedValue({ data: [mockReview], total: 1, page: 1, limit: 20 });

      const result = await service.list('merchant-1', {
        page: 1,
        limit: 20,
        source: 'GOOGLE',
        rating: 5,
        status: 'PENDING',
        search: 'priya',
        dateFrom: '2026-01-01',
        dateTo: '2026-02-01',
        sort: 'newest',
      } as never);

      expect(mockReviewRepository.findByMerchant).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: 'merchant-1',
          source: 'GOOGLE',
          rating: 5,
          status: 'PENDING',
          search: 'priya',
          dateFrom: new Date('2026-01-01'),
          dateTo: new Date('2026-02-01'),
          sort: 'newest',
        }),
      );
      expect(result.total).toBe(1);
    });
  });

  describe('create', () => {
    it('creates a review tied to the merchant', async () => {
      mockReviewRepository.create.mockResolvedValue(mockReview);

      await service.create('merchant-1', {
        customerName: 'Priya Sharma',
        customerEmail: 'priya@example.com',
        source: 'GOOGLE' as never,
        rating: 5,
        body: 'Loved it',
      });

      expect(mockReviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { connect: { id: 'merchant-1' } },
          customerName: 'Priya Sharma',
          rating: 5,
        }),
      );
    });
  });

  describe('reply', () => {
    it('sets the reply, marks REPLIED, and records who replied', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);
      mockReviewRepository.update.mockResolvedValue({ ...mockReview, status: 'REPLIED', reply: 'Thanks!' });

      await service.reply('merchant-1', 'review-1', { reply: 'Thanks!' }, 'user-1');

      expect(mockReviewRepository.update).toHaveBeenCalledWith(
        'review-1',
        expect.objectContaining({ reply: 'Thanks!', status: 'REPLIED', repliedBy: 'user-1' }),
      );
    });

    it('throws NotFoundException for a review belonging to another merchant', async () => {
      mockReviewRepository.findById.mockResolvedValue({ ...mockReview, merchantId: 'other-merchant' });

      await expect(service.reply('merchant-1', 'review-1', { reply: 'Thanks!' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockReviewRepository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the review does not exist', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(service.reply('merchant-1', 'missing', { reply: 'Thanks!' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('updates the status for an owned review', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);
      mockReviewRepository.update.mockResolvedValue({ ...mockReview, status: 'FLAGGED' });

      await service.updateStatus('merchant-1', 'review-1', { status: 'FLAGGED' as never });

      expect(mockReviewRepository.update).toHaveBeenCalledWith('review-1', { status: 'FLAGGED' });
    });
  });

  describe('delete', () => {
    it('soft-deletes an owned review', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      await service.delete('merchant-1', 'review-1');

      expect(mockReviewRepository.softDelete).toHaveBeenCalledWith('review-1');
    });

    it('throws NotFoundException instead of deleting another merchant\'s review', async () => {
      mockReviewRepository.findById.mockResolvedValue({ ...mockReview, merchantId: 'other-merchant' });

      await expect(service.delete('merchant-1', 'review-1')).rejects.toThrow(NotFoundException);
      expect(mockReviewRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('delegates to the repository', async () => {
      mockReviewRepository.getStats.mockResolvedValue({ total: 5, averageRating: 4.2, repliedCount: 3, pendingCount: 2, responseRate: 0.6 });

      const result = await service.getStats('merchant-1');

      expect(mockReviewRepository.getStats).toHaveBeenCalledWith('merchant-1');
      expect(result.total).toBe(5);
    });
  });
});
