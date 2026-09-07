import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CreateWebhookDto, UpdateWebhookDto } from '../dto';
import { WebhookDeliveryRepository, WebhookRepository } from '../repositories';

@Injectable()
export class WebhookService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly deliveryRepository: WebhookDeliveryRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForMerchant(merchantId: string) {
    return this.webhookRepository.findByMerchant(merchantId);
  }

  async getOwned(webhookId: string, merchantId: string) {
    const webhook = await this.webhookRepository.findById(webhookId);
    if (!webhook || webhook.merchantId !== merchantId) {
      throw new NotFoundException('Webhook');
    }
    return webhook;
  }

  async create(merchantId: string, dto: CreateWebhookDto) {
    const webhook = await this.webhookRepository.create({
      merchant: { connect: { id: merchantId } },
      url: dto.url,
      secret: crypto.randomBytes(32).toString('hex'),
      events: dto.events,
      enabled: dto.enabled ?? true,
    });

    await this.auditLogService.record({
      actorId: merchantId,
      actorType: 'MERCHANT',
      entity: 'Webhook',
      entityId: webhook.id,
      action: 'CREATE',
      after: { url: webhook.url, events: dto.events },
    });

    return webhook;
  }

  async update(webhookId: string, merchantId: string, dto: UpdateWebhookDto) {
    await this.getOwned(webhookId, merchantId);
    const updated = await this.webhookRepository.update(webhookId, {
      url: dto.url,
      events: dto.events,
      enabled: dto.enabled,
    });

    await this.auditLogService.record({
      actorId: merchantId,
      actorType: 'MERCHANT',
      entity: 'Webhook',
      entityId: webhookId,
      action: 'UPDATE',
    });

    return updated;
  }

  async remove(webhookId: string, merchantId: string) {
    await this.getOwned(webhookId, merchantId);
    const removed = await this.webhookRepository.softDelete(webhookId);

    await this.auditLogService.record({
      actorId: merchantId,
      actorType: 'MERCHANT',
      entity: 'Webhook',
      entityId: webhookId,
      action: 'DELETE',
    });

    return removed;
  }

  async listDeliveries(webhookId: string, merchantId: string, page: number, limit: number) {
    await this.getOwned(webhookId, merchantId);
    return this.deliveryRepository.findByWebhook(webhookId, page, limit);
  }
}
