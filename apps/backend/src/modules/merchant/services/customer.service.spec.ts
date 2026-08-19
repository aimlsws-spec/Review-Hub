import { Test, TestingModule } from '@nestjs/testing';

import { CustomerRepository } from '../repositories';

import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerService;

  const mockCustomerRepository = {
    getCustomers: jest.fn(),
  };

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerService, { provide: CustomerRepository, useValue: mockCustomerRepository }],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('labels a single-visit participant as New', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue([
        {
          userId: 'u1', firstName: 'Neha', lastName: 'Rao', email: 'neha@example.com', phone: null,
          joinedAt: daysAgo(2), lastVisit: daysAgo(1), totalVisits: 1, lifetimeRewardsPaid: 50,
          reviewCount: 0, averageRating: null,
        },
      ]);

      const result = await service.list('merchant-1', { page: 1, limit: 20 });

      expect(result.data[0]).toMatchObject({ type: 'New', status: 'Active' });
    });

    it('labels a high-spend repeat participant as VIP', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue([
        {
          userId: 'u2', firstName: 'Aarav', lastName: 'Desai', email: 'aarav@example.com', phone: null,
          joinedAt: daysAgo(200), lastVisit: daysAgo(1), totalVisits: 18, lifetimeRewardsPaid: 48250,
          reviewCount: 3, averageRating: 4.7,
        },
      ]);

      const result = await service.list('merchant-1', { page: 1, limit: 20 });

      expect(result.data[0]).toMatchObject({ type: 'VIP', lifetimeSpend: 48250, averageOrderValue: 48250 / 18 });
    });

    it('labels a multi-visit, low-spend participant as Returning', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue([
        {
          userId: 'u3', firstName: 'Rohan', lastName: 'Kapoor', email: 'rohan@example.com', phone: null,
          joinedAt: daysAgo(30), lastVisit: daysAgo(5), totalVisits: 3, lifetimeRewardsPaid: 300,
          reviewCount: 0, averageRating: null,
        },
      ]);

      const result = await service.list('merchant-1', { page: 1, limit: 20 });

      expect(result.data[0].type).toBe('Returning');
    });

    it('marks a participant with no visit in over 90 days as Inactive', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue([
        {
          userId: 'u4', firstName: 'Vikram', lastName: 'Singh', email: 'vikram@example.com', phone: null,
          joinedAt: daysAgo(400), lastVisit: daysAgo(120), totalVisits: 5, lifetimeRewardsPaid: 500,
          reviewCount: 0, averageRating: null,
        },
      ]);

      const result = await service.list('merchant-1', { page: 1, limit: 20 });

      expect(result.data[0].status).toBe('Inactive');
    });

    it('filters by search term across name and email', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue([
        { userId: 'u1', firstName: 'Neha', lastName: 'Rao', email: 'neha@example.com', phone: null, joinedAt: daysAgo(2), lastVisit: daysAgo(1), totalVisits: 1, lifetimeRewardsPaid: 0, reviewCount: 0, averageRating: null },
        { userId: 'u2', firstName: 'Aarav', lastName: 'Desai', email: 'aarav@example.com', phone: null, joinedAt: daysAgo(2), lastVisit: daysAgo(1), totalVisits: 1, lifetimeRewardsPaid: 0, reviewCount: 0, averageRating: null },
      ]);

      const result = await service.list('merchant-1', { page: 1, limit: 20, search: 'neha' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Neha Rao');
    });

    it('paginates the in-memory result set', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          userId: `u${i}`, firstName: `User${i}`, lastName: '', email: `u${i}@example.com`, phone: null,
          joinedAt: daysAgo(i), lastVisit: daysAgo(i), totalVisits: 1, lifetimeRewardsPaid: 0,
          reviewCount: 0, averageRating: null,
        })),
      );

      const result = await service.list('merchant-1', { page: 2, limit: 2 });

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('summarizes counts by type and status', async () => {
      mockCustomerRepository.getCustomers.mockResolvedValue([
        { userId: 'u1', firstName: 'A', lastName: '', email: null, phone: null, joinedAt: daysAgo(2), lastVisit: daysAgo(1), totalVisits: 1, lifetimeRewardsPaid: 0, reviewCount: 0, averageRating: null },
        { userId: 'u2', firstName: 'B', lastName: '', email: null, phone: null, joinedAt: daysAgo(200), lastVisit: daysAgo(200), totalVisits: 15, lifetimeRewardsPaid: 9000, reviewCount: 0, averageRating: null },
      ]);

      const result = await service.getStats('merchant-1');

      expect(result).toMatchObject({ total: 2, active: 1, vip: 1, newThisPeriod: 1, returning: 0 });
      expect(result.totalLifetimeValue).toBe(9000);
      expect(result.averageLifetimeValue).toBe(4500);
    });
  });
});
