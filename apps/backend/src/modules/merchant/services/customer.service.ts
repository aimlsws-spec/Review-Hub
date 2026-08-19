import { Injectable } from '@nestjs/common';

import { CustomerQueryDto } from '../dto';
import { CustomerAggregate, CustomerRepository } from '../repositories';

const VIP_LIFETIME_SPEND_THRESHOLD = 5000;
const VIP_VISIT_THRESHOLD = 10;
const INACTIVE_AFTER_DAYS = 90;

export interface CustomerView {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: 'New' | 'Returning' | 'VIP';
  status: 'Active' | 'Inactive';
  joinedAt: string;
  lastVisit: string | null;
  totalVisits: number;
  lifetimeSpend: number;
  rewardBalance: number;
  averageOrderValue: number;
  reviewCount: number;
  rating: number;
}

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async list(merchantId: string, query: CustomerQueryDto) {
    const aggregates = await this.customerRepository.getCustomers(merchantId);
    let views = aggregates.map((a) => this.toView(a));

    if (query.search) {
      const term = query.search.toLowerCase();
      views = views.filter(
        (c) => c.name.toLowerCase().includes(term) || (c.email ?? '').toLowerCase().includes(term),
      );
    }
    if (query.type) views = views.filter((c) => c.type === query.type);
    if (query.status) views = views.filter((c) => c.status === query.status);

    views.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

    const total = views.length;
    const start = (query.page - 1) * query.limit;
    const data = views.slice(start, start + query.limit);

    return { data, total, page: query.page, limit: query.limit };
  }

  async getStats(merchantId: string) {
    const aggregates = await this.customerRepository.getCustomers(merchantId);
    const views = aggregates.map((a) => this.toView(a));

    const returning = views.filter((c) => c.type === 'Returning').length;
    const totalLifetimeValue = views.reduce((sum, c) => sum + c.lifetimeSpend, 0);

    return {
      total: views.length,
      active: views.filter((c) => c.status === 'Active').length,
      vip: views.filter((c) => c.type === 'VIP').length,
      newThisPeriod: views.filter((c) => c.type === 'New').length,
      returning,
      totalLifetimeValue,
      averageLifetimeValue: views.length > 0 ? totalLifetimeValue / views.length : 0,
      retentionRate: views.length > 0 ? returning / views.length : 0,
    };
  }

  private toView(a: CustomerAggregate): CustomerView {
    const lifetimeSpend = a.lifetimeRewardsPaid;
    const isActive = a.lastVisit
      ? Date.now() - a.lastVisit.getTime() <= INACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000
      : true;

    let type: CustomerView['type'] = 'Returning';
    if (a.totalVisits <= 1) type = 'New';
    else if (lifetimeSpend >= VIP_LIFETIME_SPEND_THRESHOLD || a.totalVisits >= VIP_VISIT_THRESHOLD) type = 'VIP';

    return {
      id: a.userId,
      name: `${a.firstName} ${a.lastName}`.trim(),
      email: a.email,
      phone: a.phone,
      type,
      status: isActive ? 'Active' : 'Inactive',
      joinedAt: a.joinedAt.toISOString(),
      lastVisit: a.lastVisit ? a.lastVisit.toISOString() : null,
      totalVisits: a.totalVisits,
      lifetimeSpend,
      // No separate merchant-scoped "balance owed" concept exists — this mirrors
      // lifetimeSpend until reward-pipeline state (paid vs. pending) is exposed here.
      rewardBalance: lifetimeSpend,
      averageOrderValue: a.totalVisits > 0 ? lifetimeSpend / a.totalVisits : 0,
      reviewCount: a.reviewCount,
      rating: a.averageRating ?? 0,
    };
  }
}
