import { Injectable } from '@nestjs/common';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { AppConfigService } from '../../app-config/services';
import { UpdatePlatformConfigurationDto } from '../dto';
import { PlatformConfigurationRepository } from '../repositories';

@Injectable()
export class PlatformConfigurationService {
  constructor(
    private readonly platformConfigurationRepository: PlatformConfigurationRepository,
    private readonly auditLogService: AuditLogService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async get() {
    return this.platformConfigurationRepository.getOrCreate();
  }

  async update(dto: UpdatePlatformConfigurationDto, adminId: string) {
    const existing = await this.get();
    this.assertWithdrawalRulesMakeSense(existing, dto);
    const updated = await this.platformConfigurationRepository.update(existing.id, dto);
    // So maintenance mode and the minimum app version take effect at once here, not after the cache runs out.
    this.appConfigService.invalidate();

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'PlatformConfiguration',
      entityId: existing.id,
      action: 'CONFIG_CHANGE',
      before: this.pick(existing, dto),
      after: { ...dto },
    });

    return updated;
  }

  /** What the given fields were, so the audit entry shows the change and not only the new values. */
  private pick(existing: object, dto: object): Record<string, string | number | boolean | null> {
    const record = existing as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(dto).map((key) => {
        const value = record[key];
        return [key, value === null || typeof value === 'number' || typeof value === 'boolean' ? value : String(value)];
      }),
    );
  }

  /**
   * The withdrawal limits are checked against each other as they will be after this change, not one at a time, so
   * a limit can not be saved that makes another impossible (a minimum above the daily limit would mean nobody could
   * ever withdraw).
   */
  private assertWithdrawalRulesMakeSense(existing: Record<string, unknown>, dto: UpdatePlatformConfigurationDto) {
    const value = (key: 'minimumWithdrawal' | 'maximumWithdrawal' | 'dailyWithdrawalLimit'): number => Number(dto[key] ?? existing[key]);
    const minimum = value('minimumWithdrawal');
    const maximum = value('maximumWithdrawal');
    const daily = value('dailyWithdrawalLimit');
    const monthlyRaw = dto.monthlyWithdrawalLimit === undefined ? existing.monthlyWithdrawalLimit : dto.monthlyWithdrawalLimit;
    const monthly = monthlyRaw === null || monthlyRaw === undefined ? null : Number(monthlyRaw);

    const rate = Number(dto.tdsRate ?? existing.tdsRate ?? 0);
    const sectionRaw = dto.tdsSection === undefined ? existing.tdsSection : dto.tdsSection;
    const section = typeof sectionRaw === 'string' ? sectionRaw.trim() : '';
    if (rate > 0 && section === '') {
      throw new BadRequestException('Set the income tax section before turning on TDS: it is needed for the returns. Ask your tax adviser.');
    }

    if (minimum > maximum) throw new BadRequestException('The minimum withdrawal can not be more than the maximum');
    if (minimum > daily) throw new BadRequestException('The minimum withdrawal can not be more than the daily limit, or nobody could withdraw');
    if (monthly !== null && monthly < daily) throw new BadRequestException('The monthly limit can not be less than the daily limit');
  }
}
