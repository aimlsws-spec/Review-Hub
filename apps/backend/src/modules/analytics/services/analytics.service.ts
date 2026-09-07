import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AnalyticsEventQueryDto, RecordAnalyticsEventDto } from '../dto';
import {
  AnalyticsEventRepository,
  DailyAnalyticsRepository,
  MerchantAnalyticsRepository,
  UserAnalyticsRepository,
} from '../repositories';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly eventRepository: AnalyticsEventRepository,
    private readonly dailyRepository: DailyAnalyticsRepository,
    private readonly merchantRepository: MerchantAnalyticsRepository,
    private readonly userRepository: UserAnalyticsRepository,
  ) {}

  async recordEvent(dto: RecordAnalyticsEventDto) {
    return this.eventRepository.create({
      eventName: dto.eventName,
      eventCategory: dto.eventCategory,
      entityType: dto.entityType,
      entityId: dto.entityId,
      userId: dto.userId,
      merchantId: dto.merchantId,
      campaign: dto.campaignId ? { connect: { id: dto.campaignId } } : undefined,
      metadata: dto.metadata as Prisma.InputJsonValue,
    });
  }

  async listEvents(query: AnalyticsEventQueryDto) {
    return this.eventRepository.findAll({
      page: query.page,
      limit: query.limit,
      eventName: query.eventName,
      eventCategory: query.eventCategory,
      merchantId: query.merchantId,
      campaignId: query.campaignId,
    });
  }

  async getDailyRange(from: Date, to: Date) {
    return this.dailyRepository.findByDateRange(from, to);
  }

  async getMerchantAnalytics(merchantId: string) {
    return this.merchantRepository.findByMerchant(merchantId);
  }

  async getUserAnalytics(userId: string) {
    return this.userRepository.findByUser(userId);
  }
}
